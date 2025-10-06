# Providers

The entry point of Polkadot-API, `createClient(provider)` requires one `JsonRpcProvider`, which lets Polkadot-API communicate with a node. Let's dive into it.

## `JsonRpcProvider`

`JsonRpcProvider` is a simple function with the following shape:

```ts
interface JsonRpcProvider {
  (onMessage: (message: string) => void) => JsonRpcConnection;
}

interface JsonRpcConnection {
  send: (message: string) => void;
  disconnect: () => void;
}
```

Calling it will initiate a connection. Messages coming from the service will come through the `onMessage` call, and the returned connection handle can be used to send messages or terminate the connection.

It is noticeable that the interface is decoupled from the transport layer and it does not leak any internals of particular transports (e.g. WebSocket) that implement this interface. For example, it does not assume that the provider accept subscriptions, that can be reconnected, etc. The idea is that the interface provides the minimal set of methods to be used by clients, that do not need to know about the transport.

Besides that, `JsonRpcProvider` interface is designed so that it can be easily enhanced: the consumer can wrap any `JsonRpcProvider` with another one that adds in more features, such as logging, statistics, or error recovery. Let's show it with an example of an enhancer that just logs any message in or out:

```ts
const logProvider = (inner: JsonRpcProvider): JsonRpcProvider => {
  return (onMsg) => {
    const { send: innerSend, disconnect: innerDisconnect } = inner((msg) => {
      console.log(`MSG IN: ${msg}`)
      onMsg(msg)
    })
    return {
      send(msg) {
        console.log(`MSG OUT: ${msg}`)
        innerSend(msg)
      },
      disconnect() {
        console.log(`DISCONNECTED`)
        innerDisconnect()
      },
    }
  }
}
```

Having this clean interface allowed us to build several enhancers to increase the compatibility with, for example, Polkadot-SDK nodes that didn't comply with the JSON-RPC spec. See [this page](/requirements#chain) to see the `withPolkadotSdkCompat` enhancer.

Polkadot-API offers a couple of builtin providers for some of the most used ways of connecting to a chain:

- [`getWsProvider`](/providers/ws) from `polkadot-api/ws-provider` to connect through WebSocket.
- [`getSmProvider`](/providers/sm) from `polkadot-api/sm-provider` to connect through Smoldot.

## Logs provider

One of the enhancers that we created is `polkadot-api/logs-provider`, that can be used to create a provider that will replay node messages from a log file (`logsProvider`), along with a provider enhancer that can be used to generate the logs consumed by `logsProvider`: `withLogsRecorder`.

```ts
// 1. recording logs
import { createClient } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getWsProvider } from "polkadot-api/ws-provider"

const wsProvider = getWsProvider("wss://example.url")
// Using console.log to output each line, but you could e.g. write it directly to a
// file or push into an array
const provider = withLogsRecorder((line) => console.log(line), wsProvider)
const client = createClient(provider)
```

```ts
// 2. replaying logs
import { createClient } from "polkadot-api"
import { logsProvider } from "polkadot-api/logs-provider"
import logs from "./readLogs"

const provider = logsProvider(logs)
const client = createClient(provider)
```

This can be useful to debug specific scenarios without needing to depend on an external source.

## Legacy provider

The `@polkadot-api/legacy-provider` enhancer acts as a transparent compatibility layer and exposes the new JSON-RPC endpoints while internally translating calls to the legacy RPC APIs.

All PAPI providers assume that they are interacting with the new JSON-RPC spec. For this reason, legacy-provider-enhancer **must be applied before any other enhancer**. To make this possible, the ws-provider supports an `innerEnhancer` option, which allows enhancers to be applied at the lowest possible level.

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { withLegacy } from "@polkadot-api/legacy-provider"

const client = createClient(
  getWsProvider("wss://your-rpc.your-url.xyz", {
    innerEnhancer: withLegacy(),
  }),
)
```

:::info
`withLegacy` is not exported from top-level `polkadot-api` package. You should install `@polkadot-api/legacy-provider` with the package manager of your preference to access it.
:::
