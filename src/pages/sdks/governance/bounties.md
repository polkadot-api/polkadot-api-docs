# Bounties SDK

The Bounties SDK provides the following features:

- Loads descriptions of each bounty.
- Matches referenda related to the bounty.
- Looks for scheduled changes in the bounty status.
- Abstracts different states into a TypeScript-friendly interface.

## Getting Started

Install the Governance SDK using your package manager:

```sh
npm i @polkadot-api/sdk-governance
```

Then, initialize it by passing in the `typedApi` for your chain:

```ts
import { createBountiesSdk } from "@polkadot-api/sdk-governance"
import { dot } from "@polkadot-api/descriptors"
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"
import { createClient } from "polkadot-api"

const smoldot = start()
const chain = await smoldot.addChain({ chainSpec })

const client = createClient(getSmProvider(chain))
const typedApi = client.getTypedApi(dot)

const bountiesSdk = createBountiesSdk(typedApi)
```

## Get the current list of Bounties

The Bounties pallet stores bounty descriptions on-chain as a separate storage query. The Bounties SDK automatically loads these descriptions when retrieving any bounty.

To get the list of bounties at a given time use `getBounties`, or use `getBounty(id)` to retrieve a specific bounty by ID:

```ts
const bounties = await bountiesSdk.getBounties()
const bounty = await bountiesSdk.getBounty(10)
```

To retrieve a bounty created from a `propose_bounty` call, use `getProposedBounty` with the result from `submit`:

```ts
const tx = typedApi.tx.Bounties.propose_bounty({
  description: Binary.fromText("Very special bounty"),
  value: 100_000_000_000n,
})
const result = await tx.signAndSubmit(signer)
const bounty = await bountiesSdk.getProposedBounty(result)
```

Each bounty returned by the SDK has the information available on-chain of the bounty, enhanced based on their [State](#bounty-states), but also adds the account of the bounty, as a SS58Address. This can be used to query the current bounty balance:

```ts
const bountyAccount = await typedApi.query.System.Account.getValue(
  bounty.account,
)
console.log("Bounty balance:", bountyAccount.data.free)
```

You can also subscribe to changes using the watch API. This provides two ways of working with it: `bounties$` returns a `Map<number, Bounty>` with all bounties, and there are also `bountyIds$` and `getBountyById$(id: number)` for cases where you want to show the list and detail separately.

```ts
// Map<number, Bounty>
bountiesSdk.watch.bounties$.subscribe(console.log)

// number[]
bountiesSdk.watch.bountyIds$.subscribe(console.log)

// Bounty
bountiesSdk.watch.getBountyById$(5).subscribe(console.log)
```

The underlying subscription to bounties and descriptions is shared among all subscribers and is automatically cleaned up when all subscribers unsubscribe.

## Bounty States

Bounties have many states they can be in, each with its own available operations, and some have some extra parameters.

![Bounties](/bounties.png)

The SDK exposes these states through a union of Bounty types, discriminated by `type`. Each type includes only the methods and parameters relevant to its status.

### Proposed

After a bounty is proposed, it must be approved via a referendum. Use `approveBounty()` to create the approval transaction. Submit it as part of a referendum using the [Referenda SDK](/sdks/governance/referenda):

```ts
const approveCall = proposedBounty.approveBounty()
const callData = await approveCall.getEncodedData()

const tx = referendaSdk.createSpenderReferenda(callData, proposedBounty.value)
await tx.signAndSubmit(signer)
```

You can also filter existing referenda that are already approving the bounty:

```ts
const referenda = await referendaSdk.getOngoingReferenda()
const approvingReferenda =
  await proposedBounty.findApprovingReferenda(referenda)
```

Once the referendum passes, its content is removed from the chain and scheduled for enactment. The SDK can check the scheduler for these cases:

```ts
const scheduledApprovals = await proposedBounty.getScheduledApprovals()
// number[] which are the block number in which a change is scheduled.
console.log(scheduledApprovals)
```

### Approved

No methods are available in the Approved state. The bounty is pending the next treasury spend period to become Funded.

### Funded

After funding, a new referendum must propose a curator. This state shares methods with [Proposed](#proposed) for filtering referenda and checking the scheduler.

```ts
const curator = "…SS58 address…"
const fee = 1_000_000
const proposeCuratorCall = fundedReferendum.proposeCurator(curator, fee)
const callData = await proposeCuratorCall.getEncodedData()

const tx = referendaSdk.createSpenderReferenda(callData, fundedReferendum.value)
await tx.signAndSubmit(signer)
```

### CuratorProposed

Has methods for `acceptCuratorRole()` and `unassignCurator()`

### Active

Has methods for `extendExpiry(remark: string)` and `unassignCurator()`

### Pending Payout

Has methods for `claim()` and `unassignCurator()`. In this case, unassign curator must also happen in a referendum.

## Child Bounties

Some chains support child bounties, allowing a curator to split a bounty into smaller tasks. This feature is available through a separate SDK, which requires the chain to have `ChildBounties` pallet.

```ts
import { createChildBountiesSdk } from "@polkadot-api/sdk-governance"

const childBountiesSdk = createChildBountiesSdk(typedApi)
```

It's very similar to the bounties SDK, except that it needs a `parentId` of the parent bounty.

```ts
const parentId = 10

// Fetch one child bounty
const childBounty = await childBountiesSdk.getChildBounty(parentId, 5)

// Watch the list of child bounties
childBountiesSdk.watch(parentId).bounties$.subscribe(console.log)

// Watch the list of child bounty IDs
childBountiesSdk.watch(parentId).bountyIds$.subscribe(console.log)

// Get a specific watched child bounty
childBountiesSdk.watch(parentId).getBountyById$(5).subscribe(console.log)
```

Subscriptions to child bounties and descriptions are shared among subscribers for each `parentId` and are cleaned up when all subscribers unsubscribe.

### States

Child bounty states are simplified, and eliminates the need for referenda. The curator directly manages these bounties.

![Child Bounties](/childBounties.png)

The SDK exposes these states through a union of ChildBounty types, discriminated by `type`. Each type includes only the methods relevant to its status.
