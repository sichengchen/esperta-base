# Gateway Access

Gateway is the only Aria-owned access boundary.

## Responsibilities

- device pairing
- session authentication
- authorization
- command API
- query API
- event stream API
- gateway audit events

Gateway does not own agent execution, tool execution, workspace mutation,
memory writes, job orchestration, automation semantics, or project semantics.

## Pairing Flow

```text
1. Node creates pairing code or pairing link.
2. Client presents pairing credential.
3. Gateway verifies pairing.
4. Node creates device identity.
5. Node issues session credentials.
6. All future requests are authenticated and audited.
```

## Recommended Roles

- `owner`
- `operator`
- `viewer`
- `automation`
- `connector`
- `api_client`

## Reachability

Default bind should be loopback-first.

Operators may explicitly expose Gateway over:

- same-machine loopback
- LAN
- VPN
- tunnel
- reverse proxy
- direct public endpoint

External network publication does not change runtime semantics. It only changes
reachability.

## Security Rules

- Pairing code generation is a local/admin action.
- Every command is authenticated, authorized, and audited.
- Gateway forwards valid commands into Kernel.
- Gateway does not bypass Capability, Approval, Sandbox, or Audit.
