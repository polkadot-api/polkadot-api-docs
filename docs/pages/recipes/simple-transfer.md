# Make a simple transfer on Westend using Smoldot

For this example we will use bun. Lets initialize the project:

```sh
mkdir papi-simple-transfer
cd papi-simple-transfer
bun init -y
bun i polkadot-api @polkadot-labs/hdkd @polkadot-labs/hdkd-helpers
bun papi add -n westned2 wnd
```

This sample shows how to create a transaction on Westend,
using the light-client, in order to transfer some assets
from Alice to Bob. Simply crate an `index.ts` file with
the following content in it:

```ts
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers"
import { getPolkadotSigner } from "polkadot-api/signer"
import { createClient } from "polkadot-api"
import { MultiAddress, wnd } from "@polkadot-api/descriptors"
import { chainSpec } from "polkadot-api/chains/westend2"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"

// let's create Alice signer
const miniSecret = entropyToMiniSecret(mnemonicToEntropy(DEV_PHRASE))
const derive = sr25519CreateDerive(miniSecret)
const aliceKeyPair = derive("//Alice")
const alice = getPolkadotSigner(
  aliceKeyPair.publicKey,
  "Sr25519",
  aliceKeyPair.sign,
)

// create the client with smoldot
const smoldot = start()
const client = createClient(getSmProvider(smoldot.addChain({ chainSpec })))

// get the safely typed API
const api = client.getTypedApi(wnd)

// create the transaction sending Bob some assets
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const transfer = api.tx.Balances.transfer_allow_death({
  dest: MultiAddress.Id(BOB),
  value: 12345n,
})

// sign and submit the transaction while looking at the
// different events that will be emitted
transfer.signSubmitAndWatch(alice).subscribe({
  next: (event) => {
    console.log("Tx event: ", event.type)
    if (event.type === "txBestBlocksState") {
      console.log("The tx is now in a best block, check it out:")
      console.log(`https://westend.subscan.io/extrinsic/${event.txHash}`)
    }
  },
  error: console.error,
  complete() {
    client.destroy()
    smoldot.terminate()
  },
})
```

Once you have created the file, simply run: `bun index.ts`