## Smoldot provider

We love light-clients, and smoldot is our favorite way to connect to networks!

Smoldot can be instantiated from PAPI using both the main thread or a worker. We strongly recommend using workers for it.

## Instantiation

### Main thread

This is the easiest way of them all of instantiating smoldot. It blocks the main thread and it might have some performance issues:

```ts
import { start } from "polkadot-api/smoldot"

const smoldot = start()
```

### WebWorker

[WebWorkers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) are available in modern browser environments and [Bun](https://bun.sh). Having smoldot in a worker allows the main thread to be free to perform other tasks, since smoldot might block the main thread in some demanding tasks.

Different bundlers have slightly different ways of creating workers, let's see them.

- Vite:

```ts
import { startFromWorker } from "polkadot-api/smoldot/from-worker"
import SmWorker from "polkadot-api/smoldot/worker?worker"

const smoldot = startFromWorker(new SmWorker())
```

- Bun

```ts
import { startFromWorker } from "polkadot-api/smoldot/from-worker"

const smWorker = new Worker(import.meta.resolve("polkadot-api/smoldot/worker"))
const smoldot = startFromWorker(smWorker)
```

- Webpack

```ts
import { startFromWorker } from "polkadot-api/smoldot/from-worker"

const smWorker = new Worker(
  new URL("polkadot-api/smoldot/worker", import.meta.url),
)
const smoldot = startFromWorker(smWorker)
```

## Adding a chain

Once we have an instance of smoldot, we need to tell smoldot to connect to the chain we want. For that, we need the `chainSpec` of the chain. With `polkadot-api` we bundle chainspecs for certain well-known chains: All 5 relay chains (Polkadot, Kusama, Westend, Paseo, and Rococo) and its system chains (AssetHub, People, Coretime, Collectives, etc.).

In order to add a solo-chain (or a relay chain), it is very simple:

```ts twoslash
// [!include ~/snippets/startSm.ts]
// ---cut---
import { chainSpec } from "polkadot-api/chains/polkadot"

const polkadotChain = smoldot.addChain({ chainSpec })
//    ^?
```

In case it is a parachain, we will need both the `chainSpec` of the relay chain, and the parachain one. It is simple as well:

```ts twoslash
// [!include ~/snippets/startSm.ts]
// ---cut---
import { polkadot, polkadot_asset_hub } from "polkadot-api/chains"

const relayChain = await smoldot.addChain({ chainSpec: polkadot })
const assetHubChain = smoldot.addChain({
  chainSpec: polkadot_asset_hub,
  potentialRelayChains: [relayChain],
})
```

## Getting the provider and initializing the client

Once we have a `Chain` (or `Promise<Chain>`), we can initialize the provider and the client.

```ts twoslash
// [!include ~/snippets/startSm.ts]
// ---cut---
import { chainSpec } from "polkadot-api/chains/polkadot"
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"

// No need to await: the provider accepts promises as well.
const provider = getSmProvider(() => smoldot.addChain({ chainSpec }))

const client = createClient(provider)
```

**Important:** `getSmProvider` expects a function that creates a new chain instance. Smoldot may destroy a chain, and destroyed chains cannot be reused. The provider detects this and calls the function again to obtain a fresh chain, recovering transparently for the rest of the application. Returning the same chain instance will break this behavior.

```ts twoslash
// [!include ~/snippets/startSm.ts]
// ---cut---
import { chainSpec } from "polkadot-api/chains/polkadot"
import { chainSpec as ahChainSpec } from "polkadot-api/chains/polkadot_asset_hub"
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"

// ❌ Wrong: creating the chain outside and returning the same instance.
// If `dotChain` is destroyed, the provider cannot recover.
const dotChain = smoldot.addChain({ chainSpec })
const wrongImplementedProvider = getSmProvider(() => dotChain)

// ✅ Correct: the chain is recreated on demand.
// The provider can recover from a destroyed chain.
const provider = getSmProvider(() => smoldot.addChain({ chainSpec }))

// ✅ Same principle applies to relay chains + parachains:
// create them inside the function.
const ahProvider = getSmProvider(async () => {
  const relayChain = await smoldot.addChain({ chainSpec })
  return smoldot.addChain({
    chainSpec: ahChainSpec,
    potentialRelayChains: [relayChain],
  })
})

// Creating multiple references with the same chainSpec is safe:
// smoldot reuses them internally.
```
