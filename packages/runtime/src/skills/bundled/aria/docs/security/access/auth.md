# Gateway Authentication

Gateway is the only Aria-owned access boundary.

## Pairing

```text
1. Node creates pairing code or pairing link.
2. Client presents pairing credential.
3. Gateway verifies pairing.
4. Node creates device identity.
5. Node issues session credentials.
6. All future requests are authenticated and audited.
```

## Identities

Core identity entities:

- Node
- Device
- Principal
- Session

Recommended roles:

- `owner`
- `operator`
- `viewer`
- `automation`
- `connector`
- `api_client`

## Gateway Duties

Gateway owns:

- device pairing
- session authentication
- authorization
- command API
- query API
- event stream API
- gateway audit events

Gateway forwards authorized commands to the Application Kernel. It must not
execute tools or mutate domain state directly.
