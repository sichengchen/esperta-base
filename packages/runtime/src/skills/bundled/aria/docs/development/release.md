# Release

## CI

CI runs:

- secret scan
- lint
- typecheck
- tests
- build

## Release Flow

Tagged releases build the Bun bundle, publish GitHub artifacts, and update the Homebrew formula.

## Artifacts

The current build publishes the CLI bundle under `dist/`.
