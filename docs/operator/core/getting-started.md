# Getting Started

Install dependencies:

```bash
bun install
```

Start the current development node surface:

```bash
bun run dev:server
```

The target product model is:

```text
Desktop = Aria Node Runtime + Desktop UI
Headless = same Aria Node Runtime without Desktop UI
Mobile = remote client only
```

The current repository may still expose legacy command names while migration is
in progress. New operator docs should describe behavior in terms of Aria Node
Runtime, not a separate server runtime.
