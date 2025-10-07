# JSON-RPC Providers

The Polkadot-API entry point is `createClient(provider)`. It takes a `JsonRpcProvider` that connects to a JSON-RPC endpoint, enabling Polkadot-API to interact with the chain.

## Providers

We have mainly two first-class providers:

- [WebSocket Provider](/providers/ws), connecting to a JSON-RPC server through WebSocket.
- [Smoldot Provider](/providers/sm), connecting to a local instance of Smoldot, Polkadot's light client.

## Enhancers

Besides providers, we offer some enhancers for JSON-RPC providers, some of them increasing capabilities, and others fixing external issues.

- [Polkadot-SDK Compatibility Enhancer](/providers/enhancers#polkadot-sdk-compatibility-layer), fixing common pitfalls among JSON-RPC servers running over Polkadot-SDK nodes.
- [Legacy Provider](./enhancers#legacy-provider), exposing a JSON-RPC compliant API on top of the legacy RPC.
- [Logs Provider and Recorder](./enhancers#logs-provider), allowing to capture JSON-RPC messaging logs, useful for debugging.

## JSON-RPC providers in-depth

For a description of the provider interface, behaviour and advanced use cases such as building your own providers, check out our [JSON-RPC Provider Interface Docs](/providers/json-rpc).
