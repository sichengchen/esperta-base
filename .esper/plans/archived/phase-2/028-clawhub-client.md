---
id: 28
title: ClawHub client integration
status: done
type: feature
priority: 2
phase: phase-2
branch: feature/phase-2
created: 2026-02-19
shipped_at: 2026-02-20
pr: https://github.com/sichengchen/sa/pull/2
---
# ClawHub client integration

## Context
ClawHub (clawhub.ai) is the public skill registry for OpenClaw agents. It uses Convex as the backend, GitHub OAuth for authentication, and vector-based search over skill metadata. SA needs a client to search, browse, and install skills from ClawHub.

ClawHub API features:
- Vector search over skill text and metadata
- Download skills as zip per version
- GitHub OAuth for user authentication (required for uploads, optional for search/download)
- Skills follow the SKILL.md format with additional ClawHub-specific frontmatter

## Approach
1. Create `src/clawhub/client.ts` — ClawHub API client:
   - `search(query: string, options?)` — vector search for skills, returns metadata + scores
   - `getSkill(slug: string)` — get full skill metadata and versions
   - `download(slug: string, version?: string)` — download skill zip, extract to target directory
   - `listPopular(limit?)` — browse popular/highlighted skills
   - Handle pagination, rate limiting, error responses
2. Create `src/clawhub/installer.ts` — skill installation:
   - Download skill zip from ClawHub
   - Extract to `~/.sa/skills/<skill-name>/`
   - Validate extracted SKILL.md against agentskills.io spec
   - Check for name conflicts with existing skills
   - Track installed skills in `~/.sa/skills/.registry.json` (slug, version, installed date)
3. Create `src/clawhub/types.ts` — ClawHub API response types
4. Create a `clawhub-search` tool for the agent:
   - Agent can search ClawHub when the user asks to find/install a skill
   - Returns search results formatted for the agent to present
5. Wire up tRPC procedures:
   - `skill.search` — search ClawHub
   - `skill.install` — install from ClawHub
6. Write tests with mocked API responses

## Files to change
- `src/clawhub/client.ts` (create — ClawHub API client)
- `src/clawhub/installer.ts` (create — skill download and installation)
- `src/clawhub/types.ts` (create — API response types)
- `src/clawhub/index.ts` (create — barrel export)
- `src/tools/clawhub-search.ts` (create — agent tool for searching ClawHub)
- `src/engine/router.ts` (modify — add skill.search and skill.install procedures)
- `tests/clawhub.test.ts` (create — tests with mocked API)

## Verification
- Run: `bun test` (with mocked API)
- Run: Start Engine, chat "find a skill for git commit messages", verify search results are shown
- Expected: Search returns relevant skills, install downloads and extracts to `~/.sa/skills/`
- Edge cases: Network failure, malformed skill zip, name collision, skill update (overwrite)

## Progress
- Created src/clawhub/types.ts with ClawHubSkill, ClawHubSkillDetail, ClawHubPage, InstalledSkillEntry
- Created src/clawhub/client.ts with search, getSkill, listPopular, download methods and ClawHubError
- Created src/clawhub/installer.ts with install, uninstall, listInstalled and local .registry.json tracking
- Created src/clawhub/index.ts barrel export
- Created src/tools/clawhub-search.ts for agent to search ClawHub registry
- Updated src/engine/runtime.ts to initialize ClawHubClient, SkillInstaller, and clawhub_search tool
- Updated src/engine/router.ts with skill.search and skill.install tRPC procedures
- Created tests/clawhub.test.ts — 11 tests with mock HTTP server covering client, installer, error handling
- Modified: src/clawhub/{types,client,installer,index}.ts, src/tools/clawhub-search.ts, src/engine/{runtime,router}.ts, tests/clawhub.test.ts
- Verification: 147 tests pass, typecheck clean, lint clean
