# Gateway Operations

Gateway is the authenticated command, query, and event boundary for an Aria
Node Runtime.

## Operator Tasks

- inspect node status
- create pairing code or link
- enroll a device
- revoke a device
- inspect active sessions
- configure bind address and port
- review gateway audit events

## Default Exposure

Gateway should bind loopback-first unless the operator explicitly chooses LAN
or public reachability.

VPNs, tunnels, reverse proxies, and public endpoints only publish Gateway. They
do not replace Gateway authentication or authorization.
