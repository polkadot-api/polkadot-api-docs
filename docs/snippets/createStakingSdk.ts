import { createStakingSdk } from "@polkadot-api/sdk-staking"
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { polkadot, polkadot_asset_hub } from "polkadot-api/chains"
import { start } from "polkadot-api/smoldot"
import { dot } from "@polkadot-api/descriptors"

const smoldot = start()
const chain = smoldot.addChain({ chainSpec: polkadot }).then((relay) =>
  smoldot.addChain({
    chainSpec: polkadot_asset_hub,
    potentialRelayChains: [relay],
  }),
)

const client = createClient(getSmProvider(chain))
const typedApi = client.getTypedApi(dot)
const stakingSdk = createStakingSdk(client)
