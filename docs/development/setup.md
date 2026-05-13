# Development Setup

Install dependencies:

```bash
bun install
```

Run the current development surface:

```bash
bun run dev:server
```

Run checks:

```bash
bun run check
bun run test
bun run build
```

Target architecture work should name new modules according to
[../architecture/core/packages.md](../architecture/core/packages.md). Existing
package names may remain while migration is in progress.
