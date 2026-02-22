# Sessions

SA uses a structured session system to isolate conversations across connectors,
scheduled tasks, and webhook invocations. Every interaction with the agent runs
inside a session. The `SessionManager` class (`src/engine/sessions.ts`) owns all
session state in memory.

## Session ID Format

Every session ID follows the pattern `<prefix>:<suffix>`, where:

- **prefix** encodes the session type and context (e.g. connector type, chat ID,
  task name, or webhook slug).
- **suffix** is a random 8-character hex string generated from `crypto.randomUUID()`,
  sliced to the first 8 characters.

The prefix itself may contain colons when it carries contextual information
(a chat ID, channel ID, task name, or slug). The suffix is always the segment
after the **last** colon. Examples:

| Full Session ID             | Prefix             | Suffix     |
|-----------------------------|--------------------|------------|
| `main:a1b2c3d4`            | `main`             | `a1b2c3d4` |
| `tui:e5f6a7b8`             | `tui`              | `e5f6a7b8` |
| `telegram:123456:c9d0e1f2` | `telegram:123456`  | `c9d0e1f2` |
| `discord:789012:g3h4i5j6`  | `discord:789012`   | `g3h4i5j6` |
| `cron:daily-report:k7l8m9n0`| `cron:daily-report`| `k7l8m9n0` |
| `webhook:deploy:p1q2r3s4`  | `webhook:deploy`   | `p1q2r3s4` |

The static helper `SessionManager.getPrefix(sessionId)` extracts the prefix by
splitting at the last colon. `SessionManager.getType(sessionId)` extracts just
the first segment before the first colon (e.g. `"telegram"`, `"cron"`).

## 3-Tier Session Model

Sessions are organized into three tiers based on their purpose and lifecycle.

### Tier 1: Main Session

Format: `main:<id>`

The main session is an engine-level persistent session created at startup in
`createRuntime()`. It is not tied to any connector. Its `connectorType` is
`"engine"`.

- Created once when the engine boots (or resumed if one already exists under the
  `"main"` prefix via `getLatest("main")`).
- The heartbeat scheduler runs against a dedicated `Agent` instance associated
  with this session.
- The main session ID is stored on `EngineRuntime.mainSessionId` and exposed
  via the `mainSession.info` tRPC procedure.
- Accumulates context across heartbeat cycles for the lifetime of the engine
  process.

### Tier 2: Connector Sessions

Connector sessions are created per chat or channel. Each chat gets its own
session with isolated message history and agent state. The prefix encodes the
connector type and the external chat/channel identifier.

| Connector | Prefix Format            | Example                         |
|-----------|--------------------------|---------------------------------|
| TUI       | `tui`                    | `tui:a1b2c3d4`                  |
| Telegram  | `telegram:<chatId>`      | `telegram:123456789:e5f6a7b8`   |
| Discord   | `discord:<channelId>`    | `discord:987654321:c9d0e1f2`    |

**TUI sessions** use a flat `tui` prefix because there is only one local
terminal. On connect, the TUI calls `session.create` with `prefix: "tui"`.

**Telegram sessions** use `telegram:<chatId>` as the prefix. The
`TelegramConnector.ensureSession(chatId)` method first checks a local
`activeSessions` map, then tries `session.getLatest` to resume an existing
engine-side session, and finally falls back to `session.create`.

**Discord sessions** follow the same pattern with `discord:<channelId>`. The
`DiscordConnector.ensureSession(channelId)` mirrors the Telegram flow: local
cache, then `getLatest`, then `create`.

Each session maps to exactly one `Agent` instance. The `getSessionAgent()`
function in `procedures.ts` lazily creates an `Agent` the first time a session
receives a message, and caches it in a `sessionAgents` map keyed by session ID.

### Tier 3: Automation Sessions

Automation sessions are ephemeral, isolated, and not tied to any user-facing
connector.

**Cron sessions** (`cron:<taskName>:<id>`) are created each time a scheduled
task fires. A fresh `Agent` is instantiated, the task prompt is sent, and the
session is discarded after execution. There is no shared context between
successive runs of the same cron task -- each invocation starts clean.

**Webhook sessions** (`webhook:<slug>:<id>`) are created per invocation of
`POST /webhook/tasks/:slug`. The handler in `server.ts` calls
`sessions.create("webhook:<slug>", "webhook")`, creates an agent, runs the
prompt, and returns the response. For the generic `POST /webhook/agent`
endpoint, the prefix is just `"webhook"` (without a slug), and the caller can
optionally pass a `sessionId` in the request body to resume an existing session.

## SessionManager API

The `SessionManager` class provides the following methods:

### `create(prefix, connectorType): Session`

Creates a new session under the given prefix with a generated random suffix.
Returns a `Session` object with `id`, `connectorType`, `connectorId` (set to
the prefix), `createdAt`, and `lastActiveAt` timestamps.

### `getSession(sessionId): Session | undefined`

Retrieves a session by its full ID. Returns `undefined` if not found.

### `listSessions(): Session[]`

Returns all active sessions as an array.

### `listByPrefix(prefix): Session[]`

Returns all sessions whose ID starts with `prefix:`. This is how multiple
sessions under the same chat or task prefix are discovered.

### `getLatest(prefix): Session | undefined`

Returns the most recently active session under a prefix (by `lastActiveAt`).
This is the primary mechanism for session resumption -- connectors call this
on reconnect to pick up where they left off.

### `static getPrefix(sessionId): string`

Parses the prefix from a session ID by splitting at the last colon.
`"telegram:123456:e5f6"` returns `"telegram:123456"`.

### `static getType(sessionId): string`

Parses the type (first segment) from a session ID.
`"cron:daily-report:x7y8"` returns `"cron"`.

### `touchSession(sessionId): void`

Updates `lastActiveAt` to `Date.now()`. Called on every chat interaction to
keep the session's recency accurate.

### `destroySession(sessionId): boolean`

Removes the session from the internal map. Returns `true` if the session
existed and was deleted. Note: the corresponding `Agent` instance and
session-level tool overrides are cleaned up separately in the `session.destroy`
tRPC procedure.

### `transferSession(sessionId, targetConnectorId, targetConnectorType?): Session`

Moves a session to a different connector by updating `connectorId` and
optionally `connectorType`. Throws if the session does not exist.

## The `/new` Command

All connectors support a `/new` command that starts a fresh session under the
same prefix. The previous session is **not destroyed** -- it remains in the
`SessionManager` and its `Agent` keeps its message history in memory. The
connector simply stops routing messages to the old session and begins using the
new one.

In the TUI, `/new` first calls `session.destroy` (which removes the agent and
its history) and then creates a fresh session. In Telegram and Discord, `/new`
calls `session.create` directly without destroying the old session, so the old
session's history is preserved and can be accessed via `/sessions` or `/switch`.

## Session Lifecycle

1. **Creation**: A connector calls `session.create` via tRPC when a new chat
   begins or on first message. The `SessionManager` allocates an ID and returns
   a `Session` object.

2. **Agent binding**: On the first chat message to a session, `getSessionAgent()`
   creates an `Agent` with the engine's system prompt, model router, and tools.
   The agent is cached in `sessionAgents` for the lifetime of the session.

3. **Active use**: Each message sent through `chat.stream` or `chat.send` calls
   `touchSession()` to update `lastActiveAt`. The agent accumulates conversation
   history in memory.

4. **Resumption**: If a connector disconnects and reconnects (e.g. Telegram bot
   restart), it calls `session.getLatest` with its prefix. If a session exists,
   it resumes using that session's ID and its agent's existing history.

5. **Destruction**: Triggered by `/new` (in TUI), explicit `session.destroy`
   calls, or engine shutdown. The `session.destroy` tRPC procedure removes the
   agent from `sessionAgents`, clears session-level tool overrides from
   `sessionToolOverrides`, and deletes the session from `SessionManager`.

## Group Chat Sessions

In Telegram group chats and Discord guild channels, sessions are still
per-chat/per-channel. All participants in a group share the same session and
agent history.

To distinguish speakers, connectors prepend sender attribution to messages
before forwarding them to the engine:

```
[Alice]: What time is it?
[Bob]: Can you check the weather?
```

The system prompt includes a group chat directive instructing the agent to
address users by name when relevant and to avoid confusing different users'
messages.

Connectors gate responses in group chats -- the bot only responds when
explicitly mentioned (`@botname`) or replied to. This prevents the agent from
responding to every message in a busy group.

## tRPC Session Procedures

The engine exposes session management via the `session` tRPC router, all
behind `protectedProcedure` (requiring a valid auth token):

### `session.create`

```
input:  { connectorType: "tui" | "telegram" | "discord" | "webhook" | "engine", prefix: string }
output: Session
```

Creates a new session. The `prefix` determines the session ID structure. The
`connectorType` is stored on the session for tool approval policy resolution.

### `session.getLatest`

```
input:  { prefix: string }
output: Session | null
```

Returns the most recently active session under the given prefix, or `null` if
none exists. Used by connectors on startup to resume an existing session.

### `session.list`

```
input:  (none)
output: Session[]
```

Returns all active sessions across all connectors and tiers.

### `session.destroy`

```
input:  { sessionId: string }
output: { destroyed: boolean }
```

Destroys a session, its associated agent, and any session-level tool overrides.
Returns `{ destroyed: true }` if the session existed.

## Tool Approval and Sessions

Tool approval mode is resolved per-session based on the session's
`connectorType`. The `getApprovalMode()` function reads the
`runtime.toolApproval` config map, which can set per-connector policies:

- `"never"` (default for TUI): auto-approve moderate tools, still prompt for
  dangerous.
- `"ask"` (default for Telegram, Discord, webhook): prompt for both moderate
  and dangerous tools.
- `"always"`: prompt for all non-safe tools.

Session-level tool overrides allow a user to approve a tool "for the rest of
this session" via the `tool.acceptForSession` procedure. These overrides are
stored in `sessionToolOverrides` (a `Map<string, Set<string>>`) and are cleared
when the session is destroyed.
