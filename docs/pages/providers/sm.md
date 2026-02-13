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

This option is only guaranteed to work on Vite, but might work on other bundlers.

```ts
import { startFromWorker } from "polkadot-api/smoldot/from-worker"
import SmWorker from "polkadot-api/smoldot/worker?worker"

const smoldot = startFromWorker(new SmWorker())
```

- Bun

This option is safer than the previous one and could work in other bundlers as well.

```ts
import { startFromWorker } from "polkadot-api/smoldot/from-worker"

const smWorker = new Worker(import.meta.resolve("polkadot-api/smoldot/worker"))
const smoldot = startFromWorker(smWorker)
```

- Webpack

This option is the safest and should work in (almost) every bundler.

```ts
import { startFromWorker } from "polkadot-api/smoldot/from-worker"

const smWorker = new Worker(
  new URL("polkadot-api/smoldot/worker", import.meta.url),
)
const smoldot = startFromWorker(smWorker)
```

## Adding a chain

Once we have an instance of smoldot, we need to tell smoldot to connect to the chain we want. For that, we need the `chainSpec` of the chain. With `polkadot-api` we bundle chainspecs for certain well-known chains. We try to keep all 5 relay chains (Polkadot, Kusama, Westend, Paseo, and Rococo) and its system chains.

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

// no need to await!
const provider = getSmProvider(() => smoldot.addChain({ chainSpec }))

const client = createClient(provider)
```
