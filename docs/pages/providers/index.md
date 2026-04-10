# JSON-RPC Providers

The Polkadot-API entry point is `createClient(provider)`. It takes a `JsonRpcProvider` that connects to a JSON-RPC endpoint, enabling Polkadot-API to interact with the chain.

## Providers

We have mainly two first-class providers:

- [Smoldot Provider](/providers/sm), connecting to a local instance of Smoldot, Polkadot's light client.
- [WebSocket Provider](/providers/ws), connecting to a JSON-RPC server through WebSocket.

## Enhancers

The `JsonRpcProvider` interface is simple and unopinionated. This lets you create enhancers that add functionality, which might be useful for observability, debugging, etc.

PAPI has a [Logs Provider and Recorder](/providers/enhancers#logs-provider), allowing to capture JSON-RPC messaging logs, useful for debugging and/or analytics.
