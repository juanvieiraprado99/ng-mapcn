#!/usr/bin/env node
/**
 * Builds the component registry (`registry.json`) from the import graph of the library sources.
 *
 * The registry lists, per installable item, the files to copy (paths relative to the copy root, POSIX),
 * the items it needs and the npm packages it needs. Node built-ins only.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export class RegistryError extends Error {
  /** @param {string[]} problems */
  constructor(problems) {
    super(`Registry generation failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'RegistryError';
    this.problems = problems;
  }
}

// Packages every Angular app already has (or `init` adds: maplibre-gl, @types/geojson). Any other
// bare import, other @angular/* packages such as the optional @angular/cdk included, must be a
// peer dependency so `add` can install it.
const IGNORED_BARE =
  /^(@angular\/(core|common|platform-browser)(\/|$)|rxjs$|rxjs\/|tslib$|geojson$|maplibre-gl$|ng-mapcn$)/;
const TEXT_EXT = /\.(ts|scss|css|html)$/;
const TESTING_IMPORT = /(^|\/)testing(\/|$)/;

const toPosix = (p) => p.replace(/\\/g, '/');
const isSpec = (p) => p.endsWith('.spec.ts');

/** Collects every non-spec file under `dir` (skipping `testing/` folders). Returns POSIX paths relative to `dir`. */
function walk(dir) {
  const out = [];
  const visit = (current) => {
    for (const entry of readdirSync(current).sort()) {
      const full = join(current, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== 'testing' && entry !== 'node_modules') visit(full);
      } else if (!isSpec(entry)) {
        out.push(toPosix(relative(dir, full)));
      }
    }
  };
  if (existsSync(dir)) visit(dir);
  return out;
}

const readText = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function stripTsComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Specifiers referenced by a TS file. */
function tsSpecifiers(text) {
  const src = stripTsComments(text);
  const specs = [];
  for (const m of src.matchAll(/\b(?:import|export)\s[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g))
    specs.push(m[1]);
  for (const m of src.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) specs.push(m[1]);
  for (const m of src.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.push(m[1]);
  for (const m of src.matchAll(/\b(?:templateUrl|styleUrl)\s*:\s*['"]([^'"]+)['"]/g))
    specs.push(relativize(m[1]));
  for (const m of src.matchAll(/\bstyleUrls\s*:\s*\[([^\]]*)\]/g)) {
    for (const s of m[1].matchAll(/['"]([^'"]+)['"]/g)) specs.push(relativize(s[1]));
  }
  return specs.map((s) => s.replace(/\\/g, '/'));
}

/** Angular resolves `templateUrl`/`styleUrl` relative to the file even without `./`. */
const relativize = (s) => (s.startsWith('.') || s.startsWith('/') ? s : `./${s}`);

/** Specifiers referenced by a SCSS file. */
function scssSpecifiers(text) {
  const src = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const specs = [];
  for (const m of src.matchAll(/@(?:use|import|forward)\s+([^;]+);/g)) {
    for (const s of m[1].matchAll(/['"]([^'"]+)['"]/g)) specs.push(s[1]);
  }
  for (const m of src.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    const u = m[1].trim();
    if (u.startsWith('.')) specs.push(u);
  }
  return specs.map((s) => s.replace(/\\/g, '/'));
}

/** Folder name → item name. */
function itemNameForFolder(folder) {
  if (folder === 'map') return 'core';
  return folder.startsWith('map-') ? folder.slice('map-'.length) : folder;
}

/** Item owning a path, or null when the file is shared. */
function ownerOf(file) {
  const m = /^components\/([^/]+)\/.+/.exec(file);
  if (m) return itemNameForFolder(m[1]);
  if (file.startsWith('draw/')) return 'draw';
  return null;
}

/** First sentence of the JSDoc above `export class`. */
function describe(text) {
  const m =
    /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*(?:@\w+\([\s\S]*?\)\s*)*(?:\/\/[^\n]*\n\s*)*export\s+(?:abstract\s+)?class\b/.exec(
      text,
    );
  if (!m) return '';
  const body = m[1]
    .split('\n')
    .map((l) => l.replace(/^\s*\*?\s?/, ''))
    .join(' ');
  const noTags = body
    .split(/\s@\w+/)[0]
    .replace(/\s+/g, ' ')
    .trim();
  // Keep "e.g." / "i.e." inside the sentence and show markdown links as their text.
  const plain = noTags.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  const masked = plain.replace(/\b(e\.g|i\.e)\./g, '$1\u0000');
  const sentence = /^.*?[.!?](?=\s|$)/.exec(masked);
  return (sentence ? sentence[0] : masked).replaceAll('\u0000', '.').trim();
}

/** Package name of a bare specifier. */
function packageName(spec) {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * @param {{ libDir: string; drawDir: string; publicApiPath: string; drawPublicApiPath: string; packageJsonPath: string }} opts
 */
export function buildRegistry({
  libDir,
  drawDir,
  publicApiPath,
  drawPublicApiPath,
  packageJsonPath,
}) {
  const problems = [];
  const pkg = JSON.parse(readText(packageJsonPath));
  const peers = pkg.peerDependencies ?? {};

  // --- virtual file system: path (relative to the copy root) → absolute path ---
  /** @type {Map<string,string>} */
  const files = new Map();
  for (const f of walk(libDir)) files.set(f, join(libDir, f));
  const drawIndexAbs = resolve(drawPublicApiPath);
  const drawWalked = walk(drawDir);
  const hasDraw = drawWalked.some((f) => resolve(join(drawDir, f)) !== drawIndexAbs);
  for (const f of drawWalked) {
    if (resolve(join(drawDir, f)) === drawIndexAbs) continue;
    files.set(`draw/${f}`, join(drawDir, f));
  }
  if (existsSync(drawPublicApiPath)) files.set('draw/index.ts', drawPublicApiPath);

  const textCache = new Map();
  const textOf = (f) => {
    if (!textCache.has(f)) textCache.set(f, TEXT_EXT.test(f) ? readText(files.get(f)) : '');
    return textCache.get(f);
  };

  /** Resolves `spec` from `fromFile` the way TS / Sass would. Returns null when nothing matches. */
  const resolveSpec = (fromFile, spec) => {
    const base = posixNormalize(`${posixDirname(fromFile)}/${spec}`);
    if (base === null) return null;
    const dir = posixDirname(base);
    const name = base.slice(dir === '' ? 0 : dir.length + 1);
    const prefix = dir === '' ? '' : `${dir}/`;
    const candidates = [
      base,
      `${base}.ts`,
      `${base}/index.ts`,
      `${base}.scss`,
      `${prefix}_${name}.scss`,
      `${base}.css`,
      `${base}/index.scss`,
      `${base}/_index.scss`,
    ];
    return candidates.find((c) => files.has(c)) ?? null;
  };

  // --- public-api exports ---
  const exportStatements = []; // { line, file, names|null }
  if (existsSync(publicApiPath)) {
    const src = stripTsComments(readText(publicApiPath));
    for (const m of src.matchAll(/^export\s[^;]*?\bfrom\s*['"](\.[^'"]+)['"]\s*;/gm)) {
      const spec = m[1].replace(/\\/g, '/');
      const rel = spec.replace(/^\.\/lib\//, './');
      const file = resolveSpec('x', rel);
      const named = /^export\s+(?:type\s+)?\{([^}]*)\}/.exec(m[0]);
      exportStatements.push({
        line: m[0].replace(/\.\/lib\//, './'),
        file,
        spec,
        names: named ? exportListNames(named[1]) : null,
      });
    }
  }
  for (const e of exportStatements) {
    if (e.file === null) problems.push(`public-api export does not resolve: ${e.spec}`);
  }

  // --- edges ---
  const edgeCache = new Map();
  /** @returns {{ targets: string[]; bare: string[]; ngMapcn: string[] }} */
  const edgesOf = (file) => {
    if (edgeCache.has(file)) return edgeCache.get(file);
    const result = { targets: [], bare: [], ngMapcn: [] };
    edgeCache.set(file, result);
    const text = textOf(file);
    const isScss = file.endsWith('.scss');
    const specs = isScss ? scssSpecifiers(text) : file.endsWith('.ts') ? tsSpecifiers(text) : [];
    for (const spec of specs) {
      if (spec.startsWith('.')) {
        if (!isScss && TESTING_IMPORT.test(spec)) {
          problems.push(`${file} imports testing code: ${spec}`);
          continue;
        }
        const target = resolveSpec(file, spec);
        if (target === null) problems.push(`${file}: unresolved import '${spec}'`);
        else result.targets.push(target);
      } else if (isScss) {
        const target = spec.startsWith('sass:') ? null : resolveSpec(file, spec);
        if (target) result.targets.push(target);
      } else if (spec === 'ng-mapcn') {
        result.ngMapcn.push(...ngMapcnSymbols(text));
      } else if (/^ng-mapcn\/testing/.test(spec)) {
        problems.push(`${file} imports testing code: ${spec}`);
      } else if (!IGNORED_BARE.test(spec)) {
        result.bare.push(packageName(spec));
      }
    }
    return result;
  };

  // --- symbol → exporting file (for `from 'ng-mapcn'` in draw) ---
  const declaredNames = (file, seen = new Set()) => {
    if (seen.has(file)) return new Set();
    seen.add(file);
    const names = new Set();
    const text = stripTsComments(textOf(file));
    for (const m of text.matchAll(
      /\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|enum|function\*?|const|let|var)\s+(\w+)/g,
    ))
      names.add(m[1]);
    for (const m of text.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const n of exportListNames(m[1])) names.add(n);
    }
    for (const m of text.matchAll(/\bexport\s*\*\s*from\s*['"](\.[^'"]+)['"]/g)) {
      const target = resolveSpec(file, m[1]);
      if (target) for (const n of declaredNames(target, seen)) names.add(n);
    }
    return names;
  };
  const symbolFile = (symbol) => {
    for (const e of exportStatements) {
      if (!e.file) continue;
      if (e.names ? e.names.includes(symbol) : declaredNames(e.file).has(symbol)) return e.file;
    }
    return null;
  };

  // --- items ---
  const folders = new Set();
  for (const f of files.keys()) {
    const m = /^components\/([^/]+)\/.+/.exec(f);
    if (m) folders.add(m[1]);
  }
  const itemNames = new Set([...[...folders].map(itemNameForFolder), ...(hasDraw ? ['draw'] : [])]);
  itemNames.add('core');

  const ownFiles = (name) => [...files.keys()].filter((f) => ownerOf(f) === name);
  const coreRoots = () => {
    const roots = new Set(ownFiles('core'));
    for (const f of files.keys()) if (f.startsWith('styles/')) roots.add(f);
    if (files.has('services/index.ts')) roots.add('services/index.ts');
    for (const e of exportStatements)
      if (e.file && e.file.startsWith('providers/')) roots.add(e.file);
    return roots;
  };

  const closures = new Map();
  const closure = (name, coreSet) => {
    const roots = name === 'core' ? coreRoots() : new Set(ownFiles(name));
    const visited = new Set();
    const registryDependencies = new Set();
    const deps = new Set();
    const queue = [...roots];
    while (queue.length) {
      const file = queue.shift();
      if (visited.has(file)) continue;
      visited.add(file);
      const edges = edgesOf(file);
      for (const t of edges.targets) {
        const owner = ownerOf(t);
        if (owner === null || owner === name) queue.push(t);
        else registryDependencies.add(owner);
      }
      for (const b of edges.bare) {
        if (peers[b]) deps.add(b);
        else problems.push(`${file}: '${b}' is not listed in peerDependencies`);
      }
      for (const symbol of edges.ngMapcn) {
        const target = symbolFile(symbol);
        if (!target) {
          problems.push(`${file}: '${symbol}' is not exported by public-api`);
          continue;
        }
        const owner = ownerOf(target);
        if (owner !== null) registryDependencies.add(owner);
        else if (coreSet?.has(target)) registryDependencies.add('core');
        else queue.push(target);
      }
    }
    return { files: visited, registryDependencies, deps };
  };

  const core = closure('core');
  closures.set('core', core);
  for (const name of itemNames) if (name !== 'core') closures.set(name, closure(name, core.files));

  // --- checks ---
  const reached = new Set();
  for (const c of closures.values()) for (const f of c.files) reached.add(f);
  for (const f of files.keys()) {
    if (f.startsWith('draw/')) continue;
    if (!reached.has(f)) problems.push(`orphan file: ${f} (no item reaches it)`);
  }
  for (const e of exportStatements) {
    if (e.file && !reached.has(e.file))
      problems.push(`public-api export not reached by any item: ${e.file}`);
  }

  if (problems.length) throw new RegistryError([...new Set(problems)]);

  // --- output ---
  const sortedNames = ['core', ...[...itemNames].filter((n) => n !== 'core').sort()];
  const items = {};
  for (const name of sortedNames) {
    const c = closures.get(name);
    const regDeps = new Set(c.registryDependencies);
    if (name !== 'core') regDeps.add('core');
    regDeps.delete(name);
    items[name] = {
      name,
      description: itemDescription(name),
      files: [...c.files].sort(),
      registryDependencies: [...regDeps].sort(),
      dependencies: Object.fromEntries([...c.deps].sort().map((d) => [d, peers[d]])),
    };
  }

  function itemDescription(name) {
    const own = ownFiles(name)
      .filter((f) => f.endsWith('.component.ts'))
      .sort();
    const first = own[0];
    const desc = first ? describe(textOf(first)) : '';
    if (!desc) console.warn(`generate-registry: no JSDoc description for item '${name}'`);
    return desc;
  }

  return {
    version: pkg.version,
    items,
    exports: exportStatements.map((e) => ({ line: e.line, file: e.file })),
  };
}

function exportListNames(list) {
  return list
    .split(',')
    .map((s) => s.trim().replace(/^type\s+/, ''))
    .filter(Boolean)
    .map((s) =>
      s
        .split(/\s+as\s+/)
        .pop()
        .trim(),
    );
}

function ngMapcnSymbols(text) {
  const symbols = [];
  for (const m of stripTsComments(text).matchAll(
    /\bimport\s+(?:type\s+)?\{([^}]*)\}\s*from\s*['"]ng-mapcn['"]/g,
  )) {
    for (const part of m[1].split(',')) {
      const s = part
        .trim()
        .replace(/^type\s+/, '')
        .split(/\s+as\s+/)[0]
        .trim();
      if (s) symbols.push(s);
    }
  }
  return symbols;
}

function posixDirname(p) {
  const i = p.lastIndexOf('/');
  return i < 0 ? '' : p.slice(0, i);
}

/** Collapses `.`/`..`; null when the path climbs above the root. */
function posixNormalize(p) {
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (!out.length) return null;
      out.pop();
    } else out.push(seg);
  }
  return out.join('/');
}

export function writeRegistry(outFile, registry) {
  mkdirSync(dirname(resolve(outFile)), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(registry, null, 2)}\n`);
}

/** Paths of the real sources. */
export function realPaths(root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const lib = join(root, 'projects', 'ng-mapcn');
  return {
    libDir: join(lib, 'src', 'lib'),
    drawDir: join(lib, 'draw', 'src'),
    publicApiPath: join(lib, 'src', 'public-api.ts'),
    drawPublicApiPath: join(lib, 'draw', 'src', 'public-api.ts'),
    packageJsonPath: join(lib, 'package.json'),
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const outFile = process.argv[2];
  if (!outFile) {
    console.error('usage: node scripts/generate-registry.mjs <outFile>');
    process.exit(1);
  }
  try {
    writeRegistry(outFile, buildRegistry(realPaths()));
  } catch (error) {
    if (error instanceof RegistryError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}
