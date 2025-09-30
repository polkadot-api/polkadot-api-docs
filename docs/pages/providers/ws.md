# WS Provider

The WS provider enables PAPI to interact with JSON-RPC servers via WebSocket connection, generally Polkadot-SDK based nodes that include a JSON-RPC server. This provider is a special one, since its shape extends `JsonRpcProvider` and has some extra goodies. First of all, let's see its shape:

```ts
interface WsJsonRpcProvider extends JsonRpcProvider {
  switch: (uri?: string, protocol?: string[]) => void
  getStatus: () => StatusChange
}

interface GetWsProvider {
  (
    endpoints:
      | string
      | Array<string | { uri: string; protocol: string | string[] }>,
    config?: Partial<{
      onStatusChanged: (status: StatusChange) => void
      innerEnhancer: (input: JsonRpcProvider) => JsonRpcProvider
      timeout: number
      websocketClass: WebSocketClass
    }>,
  ): WsJsonRpcProvider
}
```

In order to create the provider, there are two overloads for it. In its simplest form, you can pass one (or more) websocket `uri`s with its optional supported protocols. For example:

```ts
import { getWsProvider } from "polkadot-api/ws-provider"

// one option
getWsProvider("wss://myws.com")

// two options
getWsProvider(["wss://myws.com", "wss://myfallbackws.com"])
```

Passing more than one websocket `uri` allows the provider to switch in case one particular websocket is down or has a wrong behavior. Besides that, the consumer can also force the switch with the exposed `switch` method, where they can specify optionally which socket to use instead.

## Additional configuration

When creating the provider, you can also pass additional configuration.

Use `innerEnhancer` to pass in enhancers that must be applied before any other enhancers (like [`legacy-provider`](/providers#legacy-provider)).

You can also pass a callback to `onStatusChanged` that will be called every time the status changes.

You can even bring your own WebSocket implementation using `websocketClass` if you prefer. By default, it uses the global WebSocket available in browsers, Node.js >=22, and Bun.

```ts
import { getWsProvider } from "polkadot-api/ws-provider"
import { withLegacy } from "@polkadot-api/legacy-provider"

const provider = getWsProvider("wss://myws.com", {
  timeout: 10_000,
  innerEnhancer: withLegacy(),
  onStatusChange: (status) => {
    switch (status.type) {
      case WsEvent.CONNECTING:
        console.log("Connecting... 🔌")
        break
      case WsEvent.CONNECTED:
        console.log("Connected! ⚡")
        break
      case WsEvent.ERROR:
        console.log("Errored... 😢")
        break
      case WsEvent.CLOSE:
        console.log("Closed 🚪")
        break
    }
  },
})
```

## Connection status

The provider also has a `getStatus` method that returns the current status of the connection. Let's see it:

```ts
enum WsEvent {
  CONNECTING,
  CONNECTED,
  ERROR,
  CLOSE,
}
type WsConnecting = {
  type: WsEvent.CONNECTING
  uri: string
  protocols?: string | string[]
}
type WsConnected = {
  type: WsEvent.CONNECTED
  uri: string
  protocols?: string | string[]
}
type WsError = {
  type: WsEvent.ERROR
  event: any
}
type WsClose = {
  type: WsEvent.CLOSE
  event: any
}
type StatusChange = WsConnecting | WsConnected | WsError | WsClose
```

- `CONNECTING`: The connection is still being opened. It includes which socket and protocols is trying to connect to. The connection will be attempted for the time set in `timeout` option, defaulting to 3.5 seconds. Afterwards, in case it didn't succeed, it will go to `ERROR` status and proceed as if it was any other error.
- `CONNECTED`: The connection has been established and is currently open. It includes which socket and protocols is trying to connect to.
- `ERROR`: The connection had an error. The provider will try to reconnect to other websockets (if available) or the same one. It includes the event sent by the server.
- `CLOSE`: The connection closed. If the server was the one closing the connection, the provider will try to reconnect to other websockets (if available) or the same one. It includes the event sent by the server.

`provider.getStatus()` returns the current status.
