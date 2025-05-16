# Connect to multiple chains

## Simultaneous connections

A very common use case is to connect to both the relay chain and a parachain simultaneously, for example polkadot and polkadot people to check for address identities. In this example we will use smoldot for a more complete example.

We will use bun, since it can also run typescript directly. For the setup, we will install polkadot-api, and add two well-known chains: polkadot and polkadot_people.

```sh
mkdir papi-multichain
cd papi-multichain
bun init -y
bun i polkadot-api
bun papi add -n polkadot dot --skip-codegen
bun papi add -n polkadot_people people
```

Then let's create the `index.ts` file and follow along through the steps:

```ts
import { Binary, createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"
import { chainSpec as dotChainSpec } from "polkadot-api/chains/polkadot"
import { chainSpec as peopleChainSpec } from "polkadot-api/chains/polkadot_people"
import { dot, people, IdentityData } from "@polkadot-api/descriptors"

/// Start smoldot and setup its chains
const smoldot = start()
const dotChain = smoldot.addChain({ chainSpec: dotChainSpec })

// When adding a parachain to smoldot we need to pass its relay chain in "potentialRelayChains". This is the awaited value from `smoldot.addChain`.
// We could use `await`, but if we want the dApp to not block we can use simple promise chaining.
const peopleChain = dotChain.then((chain) =>
  smoldot.addChain({
    chainSpec: peopleChainSpec,
    potentialRelayChains: [chain],
  }),
)

/// Create the clients and their typedApis
console.log("Initializing…")
const dotClient = createClient(getSmProvider(dotChain))
const dotApi = dotClient.getTypedApi(dot)

const peopleClient = createClient(getSmProvider(peopleChain))
const peopleApi = peopleClient.getTypedApi(people)

// dotApi and peopleApi can now be used simultaneously. Both are using the same smoldot instance, and work as two separate clients.

// Optionally, wait until we have received the initial block for both chains
await Promise.all([dotApi.compatibilityToken, peopleApi.compatibilityToken])

// to complete the example, let's check the balance and identity of one account.
const ADDRESS = "16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J"
const DECIMALS = 10

console.log("Fetching info…")
const [account, identity] = await Promise.all([
  dotApi.query.System.Account.getValue(ADDRESS),
  peopleApi.query.Identity.IdentityOf.getValue(ADDRESS),
])

// Identity unfortunately comes with a format that can't be parsed directly
const identityDataToString = (data: IdentityData | undefined) => {
  if (!data || data.type === "None" || data.type === "Raw0") return null
  if (data.type === "Raw1")
    return Binary.fromBytes(new Uint8Array(data.value)).asText()
  return data.value.asText()
}
const name = identityDataToString(identity?.[0].info.display) ?? ADDRESS
const freeBalance = Number(account.data.free) / Math.pow(10, DECIMALS)

console.log(`${name}'s balance is ${freeBalance.toLocaleString()} DOT`)

// To have the process exit cleanly, we can now close all connections and terminate smoldot.
dotClient.destroy()
peopleClient.destroy()
await smoldot.terminate()

process.exit(0)
```

You can try this by running `bun index.ts`

## Composing TypedAPIs for utility functions

Another use case is when you have a dApp that will connect to only one specific chain at a given time, but that chain might change. Maybe your dApp works for Polkadot, Kusama, Westend and Paseo.

It's important to understand the role of PAPI descriptors: they are the typescript definitions for the chain they are generated, and during runtime it checks whether those interactions hold true to the types you've built your dApp with.

This means that sometimes **it's fine to use only one set of descriptors from only one chain** if you know that the interactions you use are stable enough and common between all of the chains you'll connect with. In case you connect to a chain that doesn't have a compatible interaction PAPI will detect that and throw an appropriate error.

For more complex cases, it's often a good idea to have one set of descriptors per each chain. PAPI actually finds what's common between the interactions of all of the chains you've added, and doesn't add duplicate definitions to them. Many times, the descriptor bundle won't increase too much in size.

The types can easily be composed. Let's say we want to write a function to get the balance of the address controlling a specific proxy that works across different chains, polkadot and westend:

```ts
import { dot, wnd } from "@polkadot-api/descriptors"
import type { SS58String, TypedApi } from "polkadot-api"

type CommonTypedApi = TypedApi<typeof dot> | TypedApi<typeof wnd>

async function getProxyControllerBalance(
  typedApi: CommonTypedApi,
  proxyAddress: SS58String,
) {
  const [proxies] = await typedApi.query.Proxy.Proxies.getValue(proxyAddress)

  const delegate = proxies[0]?.delegate
  if (!delegate) return 0n

  const account = await typedApi.query.System.Account.getValue(delegate)
  return account.data.free
}
```

The `TypedApi` type is prepared so that Typescript will actually do the intersection of both chains. If they have the same types for the interaction you're using, typescript will suggest those with intellisense.

There might be more complex cases where the same function maybe has to use different paths depending on what's the current chain. In this case, you can use the compatibility API to detect that, but you will need a cast to check for that specific TypedAPI. Currently, the bounties pallet has an update on Kusama that adds a new extrinsic that speeds up the process of proposing a bounty:

```ts
import { dot, ksm, MultiAddress } from "@polkadot-api/descriptors"
import { CompatibilityLevel, type TypedApi } from "polkadot-api"

type CommonTypedApi = TypedApi<typeof dot> | TypedApi<typeof ksm>

async function approveBountyWithCurator(
  typedApi: CommonTypedApi,
  bounty_id: number,
  curator: MultiAddress,
  fee: bigint,
) {
  const ksmApi = typedApi as TypedApi<typeof ksm>
  if (
    await ksmApi.tx.Bounties.approve_bounty_with_curator.isCompatible(
      CompatibilityLevel.Partial,
    )
  ) {
    // We're sure that this is now compatible
    return ksmApi.tx.Bounties.approve_bounty_with_curator({
      bounty_id,
      curator,
      fee,
    })
  }

  // It's still possible to do, but we need to schedule the propose_curator call
  const estimatedFundingBlock = 0 // TODO outside of scope of this example

  return typedApi.tx.Utility.batch({
    calls: [
      // First approve bounty
      typedApi.tx.Bounties.approve_bounty({
        bounty_id,
      }).decodedCall,
      // Then after the referendum has been executed and a treasury spend period has happened
      typedApi.tx.Scheduler.schedule({
        when: estimatedFundingBlock,
        maybe_periodic: undefined,
        priority: 1,
        // We can call `propose_curator` to avoid going through another referendum.
        call: typedApi.tx.Bounties.propose_curator({
          bounty_id,
          curator,
          fee,
        }).decodedCall,
      }).decodedCall,
    ],
  })
}
```
