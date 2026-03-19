// [!region import]
// `dot` is the name we gave to `npx papi add`
import { dot } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
// [!endregion import]
// [!region smoldot]
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"

// if interested, check out how to create a smoldot instance in a WebWorker
// http://papi.how/providers/sm#webworker
const smoldot = start()

// Connect to the polkadot relay chain.
const client = createClient(
  getSmProvider(() => smoldot.addChain({ chainSpec })),
)
// [!endregion smoldot]

// [!region websocket]
import { getWsProvider } from "polkadot-api/ws"

// Connect to the polkadot relay chain.
const client = createClient(getWsProvider("wss://dot-rpc.stakeworld.io"))
// [!endregion websocket]

// [!region usage]
// With the `client`, you can get information such as subscribing to the last
// block to get the latest hash:
client.finalizedBlock$.subscribe((finalizedBlock) =>
  console.log(finalizedBlock.number, finalizedBlock.hash),
)

// To interact with the chain, you need to get the `TypedApi`, which includes
// all the types for every call in that chain:
const dotApi = client.getTypedApi(dot)

// get the value for an account
const accountInfo = await dotApi.query.System.Account.getValue(
  "16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J",
)
// [!endregion usage]
