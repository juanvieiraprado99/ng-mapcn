# Security Policy

## Supported versions

Only the latest `22.x` line receives security fixes.

| Version      | Supported |
| ------------ | --------- |
| `22.x` (beta) | ✅        |
| `< 22`       | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report them privately through GitHub's private vulnerability reporting:
<https://github.com/juanvieiraprado99/ng-mapcn/security/advisories/new>

Please include:

- The affected version of `ng-mapcn`.
- How you installed it: the `ng add` copy-paste sources or the npm package.
- Steps to reproduce, ideally with a minimal example.
- The impact you expect (what an attacker could do).

What to expect:

- An acknowledgement within 7 days.
- A best-effort fix, released in a new version of the latest `22.x` line.
- Credit in the published advisory, if you want it.

## Scope

When you run `ng add ng-mapcn`, the component sources are copied into your project and become your code. Fixes ship in new releases of the package, so they must be re-applied or re-copied into your project. Vulnerabilities in `maplibre-gl` itself should be reported to the [MapLibre project](https://github.com/maplibre/maplibre-gl-js).
