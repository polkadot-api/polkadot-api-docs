# Preparing for a runtime upgrade

With Polkadot-API's support for multiple chains, you can make your dApp prepare for an upcoming runtime upgrade on a chain as long as you can get the metadata for that upgrade.

As an example, let's imagine we have already set up the polkadot relay chain for our dApp

```sh
npx papi add dot -n polkadot
```

You can directly compile (or download from a GitHub CI, for example) your WASM runtime and PAPI will get the metadata from it and will be able to generate the descriptors.

```sh
npx papi add nextDot --wasm polkadot_next_runtime.compressed.wasm
npx papi generate
```

:::info
We have in our roadmap to support downloading an upcoming metadata from a referenda link
:::

Now on the code you can create two typed APIs for the same chain, and then use the compatibility check to use one or the other.

To make it clear, the `client` is connected to one chain that's using one specific version of the runtime. You can create multiple typedApis for that connection, which just give you the types for each possible version of the runtime. Then you can use runtime compatibility checks to perform the operation on the correct descriptor.

```ts
import { createClient } from "polkadot-api"
import { dot, nextDot, MultiAddress } from "@polkadot-api/descriptors"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { startFromWorker } from "polkadot-api/smoldot/from-worker"
import SmWorker from "polkadot-api/smoldot/worker?worker"

const smoldot = startFromWorker(new SmWorker())
const chain = await smoldot.addChain({ chainSpec })
const client = createClient(getSmProvider(chain))

const dotApi = client.getTypedApi(dot)
const nextApi = client.getTypedApi(nextDot)

function performTransfer() {
  // check if we're running on the next version to run that first
  if (await nextApi.tx.Balances.new_fancy_transfer.isCompatible()) {
    nextApi.tx.Balances.new_fancy_transfer({
      dest: MultiAddress.Id("addr"),
      value: 5n,
    })
  } else {
    // Otherwise perform the transfer the old way with the old descriptors
    dotApi.tx.Balances.transfer_keep_alive({
      dest: MultiAddress.Id("addr"),
      value: 5n,
    })
  }
}
```

Furthermore, the runtime upgrade might happen while the dApp is running, and this will still work without needing to redo the connection. As soon as the upgrade is received, the compatible check will work as expected and the dApp will start using the next runtime.

As a note, `isCompatible` is a function available on every interaction on the typedApi (queries, apis, constants, events, transactions). If used without any parameter it will return a `Promise<boolean>`, because it needs to wait for the runtime to be loaded before it can tell whether it's compatible or not.

If you have multiple `isCompatible` checks that you don't want to wait for each one of them, you can first wait for the runtime to be loaded with `await dotApi.runtime.latest()`, and then pass this to `isCompatible` as a paramter. This will make `isCompatible` return synchronously.
