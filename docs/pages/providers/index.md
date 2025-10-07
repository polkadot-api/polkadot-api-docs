# JSON-RPC Providers

The Polkadot-API entry point is `createClient(provider)`. It takes a `JsonRpcProvider` that connects to a JSON-RPC endpoint, enabling Polkadot-API to interact with the chain.

## Providers

We have mainly two first-class providers:

- [Smoldot Provider](/providers/sm), connecting to a local instance of Smoldot, Polkadot's light client.
- [WebSocket Provider](/providers/ws), connecting to a JSON-RPC server through WebSocket.

## Enhancers

Besides providers, we offer some enhancers for JSON-RPC providers, some of them increasing capabilities, and others fixing external issues.

- [Polkadot-SDK Compatibility Enhancer](/providers/enhancers#polkadot-sdk-compatibility-layer), fixing common pitfalls among JSON-RPC servers running over Polkadot-SDK nodes.
- [Legacy Provider](/providers/enhancers#legacy-provider), a compliant middleware that exposes the modern [JSON-RPC APIs](https://paritytech.github.io/json-rpc-interface-spec/) while delegating calls to the legacy JSON-RPC APIs.
- [Logs Provider and Recorder](./enhancers#logs-provider), allowing to capture JSON-RPC messaging logs, useful for debugging and/or analytics.

## JSON-RPC providers in-depth

For a description of the provider interface, behaviour and advanced use cases such as building your own providers, check out our [JSON-RPC Provider Interface Docs](/providers/json-rpc).
