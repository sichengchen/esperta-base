# Migration

This page documents the remaining data-migration procedure that still ships in the repo.

## Scope

The architecture and package migration work is complete. The only migration flow that remains documented here is the legacy Esperta Code import handled by:

- `scripts/migrate-legacy-esperta-code.ts`

Use this page when you need to import older local state into the current Aria runtime home.

## What The Tool Preserves

The migration tool attempts to preserve:

- projects and repos
- tasks, threads, and jobs
- dispatch and worktree relationships where recoverable
- external refs to legacy systems

## Safe Write-Mode Flow

The tool supports a read-only dry run and a write pass.

- Dry run leaves the target database untouched.
- Write mode creates a backup directory under `.aria-migration-backups/`, writes `migration-manifest.json`, and prints rollback instructions on stderr.

Recommended procedure:

1. Run the migration with `--dry-run` first and save the JSON output.
2. Review the dry-run output as the migration report.
3. Rerun the same command without `--dry-run` only after that review.
4. Keep the generated backup directory and manifest until validation is complete.

## Rollback

If the write pass needs to be undone:

1. Stop Aria.
2. Restore `aria.db` from the generated backup copy in the migration backup directory.
3. Restore any companion files that were copied beside it.
4. Rerun dry-run before retrying the write pass.

When no pre-existing target database existed, rollback is deleting the imported target db and reseeding from the original source.

## Current State

- the old root `src` tree is gone
- the repo is package-first
- `docs/architecture/*` is the canonical architecture path
- the migration tool remains only for legacy local-state import
