# Providers

The entry point of Polkadot-API, `createClient(provider)` requires one `JsonRpcProvider`, which lets Polkadot-API communicate with a node. It's a function with the following shape:

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

Polkadot-API offers a couple of providers for some of the most used ways of connecting to a chain:

- [`getWsProvider`](/providers/ws) from `polkadot-api/ws-provider/web` or `polkadot-api/ws-provider/node` (depending on where your code is running) to connect through WebSocket.
- [`getSmProvider`](/providers/sm) from `polkadot-api/sm-provider` to connect through Smoldot.

The `JsonRpcProvider` interface is designed so that it can be easily enhanced: You can wrap any JsonRpcProvider with another one that adds in more features, such as logging, statistics, or error recovery. Let's see the two PAPI builtin providers in the next pages.

## Logs provider

Polkadot-API has a subpackage `polkadot-api/logs-provider` that can be used to create a provider that will replay node messages from a log file (`logsProvider`), along with a provider enhancer that can be used to generate the logs consumed by `logsProvider`: `withLogsRecorder`.

```ts
// 1. recording logs
import { createClient } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { getWsProvider } from "polkadot-api/ws-provider/node"

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
