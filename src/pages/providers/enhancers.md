# Enhancers

The JSON-RPC interface is completely unopinionated, which makes it simple to create and use middlewares that deal with the JSON-RPC connection.

```ts
interface JsonRpcProvider {
  (onMessage: (message: JsonRpcMessage) => void) => JsonRpcConnection;
}

interface JsonRpcConnection {
  send: (message: JsonRpcRequest) => void;
  disconnect: () => void;
}

type JsonRpcId = string | number | null
type JsonRpcRequest = {
  jsonrpc: "2.0"
  method: string
  params?: any
  id?: JsonRpcId
}
type JsonRpcResponse = {
  jsonrpc: "2.0"
  id: JsonRpcId
} & (
  | {
      result: any
    }
  | {
      error: {
        code: number
        message: string
        data?: any
      }
    }
)
type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse
```

Simply explained, a `JsonRpcProvider` is a function that when called, will initiate a connection with a server. It takes in a callback function, where server messages will be emitted, and returns a `JsonRpcConnection`, which is used to either send messages or disconnect from the server.

If the connection is dropped, this is handled in a different layer: e.g. the WebSocket will notify the connection is dropped. This is what lets the provider stay unopinionated from the transport layer, since there are transports that don't rely on network connections.

## Logs Provider

For instance, we can easily create a JsonRPC enhancer that logs the message sent and received from the server:

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

As this is a rather useful utility, it's one of the enhancers that we created is `polkadot-api/logs-provider`, that can be used to create a provider that will replay node messages from a log file (`logsProvider`), along with a provider enhancer that can be used to generate the logs consumed by `logsProvider`: `withLogsRecorder`.

```ts
// 1. recording logs
import { createClient } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getWsProvider } from "polkadot-api/ws"

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
