## Polkadot-SDK Compatibility Layer

If using Polkadot-API client through Smoldot provider (light client) there are no specific requirements.

Nevertheless, some [WS Providers](./ws) over a [Paritytech Polkadot-SDK](https://github.com/paritytech/polkadot-sdk) based node offer a flawed version of the JSON-RPC API Spec, which can be solved in the client in some cases.

:::warning
If you are using [`@polkadot-api/legacy-provider`](./enhancers#legacy), **DO NOT** use `withPolkadotSdkCompat`. `withLegacy` already tackles every bit to offer a spec compliant JSON-RPC server.
:::

Our recommendation is to **always use** `withPolkadotSdkCompat` to avoid any issues, but there are three cases:

#### Polkadot-SDK `>= 1.16` (`stable-2409`)

Polkadot-API will work without any issues. The WebSocket provider could be used without further issues:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const client = createClient(getWsProvider("wss://your-rpc.your-url.xyz"))
```

#### Polkadot-SDK `1.1 <= x < 1.16`

If your node uses versions between `1.1` and `1.11`, you are still good to go with Polkadot-API. The node implements the JSON-RPC spec wrongly, but we provide some enhancers to workaround these flaws. You need to start the connection as follows:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://your-rpc.your-url.xyz")),
)
```

#### Polkadot-SDK `< 1.1.0`

The JSON-RPC spec implemented prior `1.1` was really poor and we cannot feasibly workaround it. Polkadot-API does not support those nodes.

## Legacy Provider

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

## Logs Provider

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
