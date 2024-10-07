# WS Provider

The WS provider enables PAPI to interact with JSON-RPC servers via WebSocket connection, generally Polkadot-SDK based nodes that include a JSON-RPC server. This provider is an special one, since its shape extends `JsonRpcProvider` and has some extra goodies. First of all, let's see its shape:

```ts
interface WsJsonRpcProvider extends JsonRpcProvider {
  switch: (uri?: string, protocol?: string[]) => void
  getStatus: () => StatusChange
}

interface GetWsProvider {
  (
    uri: string,
    protocols?: string | string[],
    onStatusChanged?: (status: StatusChange) => void,
  ): WsJsonRpcProvider
  (
    uri: string,
    onStatusChanged?: (status: StatusChange) => void,
  ): WsJsonRpcProvider
  (
    endpoints: Array<string | { uri: string; protocol: string[] }>,
    onStatusChanged?: (status: StatusChange) => void,
  ): WsJsonRpcProvider
}
```

In order to create the provider, there are three overloads for it. In a nutshell, one can pass one (or more) websocket `uri`s with its optional supported protocols. For example:

```ts
import { getWsProvider } from "polkadot-api/ws-provider/web"

// one option
getWsProvider("wss://myws.com")

// two options
getWsProvider(["wss://myws.com", "wss://myfallbackws.com"])
```

Passing more than one allows the provider to switch in case one particular websocket is down or has a wrong behavior. Besides that, the consumer can also force the switch with the exposed `switch` method, where they can specify optionally which socket to use instead.

## Connection status

The provider also has a `getStatus` method that it returns the current status of the connection. Let's see it:

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

- `CONNECTING`: The connection is still being opened. It includes which socket and protocols is trying to connect to.
- `CONNECTED`: The connection has been established and is currently open. It includes which socket and protocols is trying to connect to.
- `ERROR`: The connection had an error. The provider will try to reconnect to other websockets (if available) or the same one. It includes the event sent by the server.
- `CLOSE`: The connection closed. If the server was the one closing the connection, the provider will try to reconnect to other websockets (if available) or the same one. It includes the event sent by the server.

`provider.getStatus()` returns the current status.

When creating the provider, the consumer can pass a callback that will be called every time the status changes:

```ts
const provider = getWsProvider("wss://myws.com", (status) => {
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
})
```
