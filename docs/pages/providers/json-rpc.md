## `JsonRpcProvider`

A `JsonRpcProvider` is a simple function with the following shape:

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
