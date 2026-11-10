export interface RegistryItem {
  name: string;
  description: string;
  /** POSIX paths relative to the copy root. */
  files: string[];
  registryDependencies: string[];
  /** npm dependencies: package name to semver range. */
  dependencies: Record<string, string>;
}

export interface RegistryExport {
  line: string;
  file: string;
}

export interface Registry {
  version: string;
  items: Record<string, RegistryItem>;
  exports: RegistryExport[];
}
