# Getting Started

Start by installing `polkadot-api`, and download the latest metadata from the chain you want to connect to and generate the types:

:::code-group

```sh [npm]
npm i polkadot-api

# `papi add` is the command
# `dot` is the name we're giving to this chain (can be any JS variable name)
# `-n polkadot` specifies to download the metadata from the well-known chain polkadot
npx papi add dot -n polkadot
# Wait for the latest metadata to download, then generate the types:
npx papi
```

```sh [pnpm]
pnpm add polkadot-api

# `papi add` is the command
# `dot` is the name we're giving to this chain (can be any JS variable name)
# `-n polkadot` specifies to download the metadata from the well-known chain polkadot
pnpm papi add dot -n polkadot
# Wait for the latest metadata to download, then generate the types:
pnpm papi
```

```sh [bun]
bun add polkadot-api

# `papi add` is the command
# `dot` is the name we're giving to this chain (can be any JS variable name)
# `-n polkadot` specifies to download the metadata from the well-known chain polkadot
bun papi add dot -n polkadot
# Wait for the latest metadata to download, then generate the types:
bun papi
```

:::

:::info
It's a really good idea to add papi to the "postinstall" script in package.json to automate generating the types after installation.
:::

Now you can create a `PolkadotClient` instance with a [provider](/providers) of your choice and start interacting with the API:

### 1. Create the provider and Start the client

:::code-group

```typescript [Smoldot]
// [!include ~/snippets/gettingStarted.ts:import]
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"

// if interested, check out how to create a smoldot instance in a WebWorker
// http://papi.how/providers/sm#webworker
const smoldot = start()
const chain = await smoldot.addChain({ chainSpec })

// Connect to the polkadot relay chain.
const client = createClient(getSmProvider(chain))
```

```typescript [WebSocket]
// [!include ~/snippets/gettingStarted.ts:import]
import { getWsProvider } from "polkadot-api/ws-provider"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"

// Connect to the polkadot relay chain.
const client = createClient(
  // Polkadot-SDK Nodes have issues, see the documentation for more info
  // on this enhancer https://papi.how/providers/enhancers#polkadot-sdk-compatibility-layer
  withPolkadotSdkCompat(getWsProvider("wss://dot-rpc.stakeworld.io")),
)
```

:::

### 2. Start consuming the client!

```typescript
// [!include ~/snippets/gettingStarted.ts:usage]
```
