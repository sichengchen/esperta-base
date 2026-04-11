# Relay Model

`packages/relay` provides paired-device trust and remote control transport for Aria Remote.

## Role

Relay lets a paired device attach to a runtime session and send normalized control envelopes.

## Durable Relay State

- paired devices
- session attachments
- queued follow-up messages
- queued approval responses
- delivery state for queued envelopes

## Boundaries

- Relay does not own runtime execution.
- Relay does not own tracked-work state.
- Relay does not bypass approval policy; it forwards responses into the existing runtime flow.

## Current CLI Surface

`aria relay` supports registration, revocation, attachment, queued message forwarding, queued approval forwarding, and delivery bookkeeping.
