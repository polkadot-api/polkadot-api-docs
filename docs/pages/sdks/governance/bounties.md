# Bounties SDK

The Bounties SDK provides the following features:

- Loads descriptions of each bounty
- Matches referenda related to the bounty
- Looks for scheduled changes on the bounty status
- Abstracts the different states into a TS-friendly interface

## Getting Started

Install the governance SDK using your package manager:

```sh
npm i @polkadot-api/sdk-governance
```

Then, initialize it by passing in the `typedApi` for your chain:

```ts
import { createBountiesSdk } from '@polkadot-api/sdk-governance';
import { dot } from '@polkadot-api/descriptors';
import { getSmProvider } from 'polkadot-api/sm-provider';
import { chainSpec } from 'polkadot-api/chains/polkadot';
import { start } from 'polkadot-api/smoldot';
import { createClient } from 'polkadot-api';

const smoldot = start();
const chain = await smoldot.addChain({ chainSpec });

const client = createClient(getSmProvider(chain));
const typedApi = client.getTypedApi(dot);

const bountiesSdk = createBountiesSdk(typedApi);
```

## Get the current list of bounties

The bounties pallet has the description of the bounties on-chain but as a separate storage query. The Bounties SDK helps by loading the descriptions automatically when getting any bounty.

To get the list of bounties at a given time, you can use `getBounties`, or `getBounty(id)` to get one by id:

```ts
const bounties = await bountiesSdk.getBounties();
const bounty = await bountiesSdk.getBounty(10);
```

Alternatively, to get the bounty that was created from a `propose_bounty` call, use the `getProposedBounty` passing in the result from `submit`:

```ts
const tx = typedApi.tx.Bounties.propose_bounty({
  description: Binary.fromText("Very special bounty"),
  value: 100_000_000_000n,
});
const result = await tx.signAndSubmit(signer);
const bounty = await bountiesSdk.getProposedBounty(result);
```

You can also subscribe to changes by using the watch API. This offers two ways of working with it: `bounties$` gives a `Map<number, Bounty>` with all the bounties in it, but it's also offered as a separate `bountyIds$` list of ids and `getBountyById$(id: number)`, which is useful in some applications.

```ts
// Map<number, Bounty>
bountiesSdk.watch.bounties$.subscribe(console.log)

// number[]
bountiesSdk.watch.bountyIds$.subscribe(console.log)

// Bounty
bountiesSdk.watch.getBountyById$(5).subscribe(console.log)
```

The underlying subscription to the bounties and descriptions is shared among all subscribers, and is cleaned up as soon as all subscribers unsubscribe.

## Bounty states

The bounties have many states they can be in, and each one have their own list of operations, and some have some extra parameters.

![Bounties](/bounties.png)

The SDK exposes this with a union of Bounty types, which can be discriminated by `type`. Each of these types have only the methods available to their status.

### Proposed

After a bounty is proposed, it must be approved through a referendum. The function `approveBounty()` creates the approve transaction, but you should submit it as part of a referendum. You can use the [Referenda SDK](/sdks/governance/referenda) for that:

```ts
const approveCall = proposedBounty.approveBounty();
const callData = await approveCall.getEncodedData();

const tx = referendaSdk.createSpenderReferenda(callData, proposedBounty.value);
await tx.signAndSubmit(signer);
```

The proposed bounty also has a function to filter referenda that's approving it. Again, by using the [Referenda SDK](/sdks/governance/referenda) you can get the list of referenda and then filter it:

```ts
const referenda = await referendaSdk.getOngoingReferenda();
const approvingReferenda = await proposedBounty.findApprovingReferenda(referenda);
```

Once the referendum has passed, it gets removed from on-chain, but it's added to the scheduler to actually perform the call after the enactment. For these cases, the SDK can also look at the scheduler:

```ts
const scheduledApprovals = await proposedBounty.getScheduledApprovals();
// number[] which are the block number in which a change is scheduled.
console.log(scheduledApprovals);
```

### Approved

No methods exists after the bounty has been approved. It's now pending the next treasury spend period before it becomes Funded.

### Funded

After it has been funded, a new referendum must be created proposing a curator. In this status, it has the same methods as [Proposed](#proposed) to filter existing referenda and lookup the scheduler.

```ts
const curator = "…SS58 address…";
const fee = 1_000_000;
const proposeCuratorCall = fundedReferendum.proposeCurator(curator, fee);
const callData = await proposeCuratorCall.getEncodedData();

const tx = referendaSdk.createSpenderReferenda(callData, fundedReferendum.value);
await tx.signAndSubmit(signer);
```

### CuratorProposed

Has methods for `acceptCuratorRole()` and `unassignCurator()`

### Active

Has methods for `extendExpiry(remark: string)` and `unassignCurator()`

### Pending Payout

Has methods for `claim()` and `unassignCurator()`. In this case, unassign curator must also happen in a referendum.

## Child bounties

Some chains also have a pallet for child bounties, which let the curator of a bounty to manage and split it into smaller child bounties.

This is exposed as a separate sdk, as it requires the ChildBounties pallet.

```ts
import { createChildBountiesSdk } from '@polkadot-api/sdk-governance';

const childBountiesSdk = createChildBountiesSdk(typedApi);
```

It's very similar to the bounties SDK, except that it needs a `parentId` of the parent bounty.

```ts
const parentId = 10;

// fetch one child bounty
const childBounty = await childBountiesSdk.getChildBounty(parentId, 5);

// watch the list of child bounties as a Map<number, ChildBounty>
childBountiesSdk.watch(parentId).bounties$.subscribe(console.log);
// watch the list of child ids as a number[]
childBountiesSdk.watch(parentId).bountyIds$.subscribe(console.log);
// get one specific watched bounty
childBountiesSdk.watch(parentId).getBountyById$(5).subscribe(console.log);
```

The underlying subscription to the child bounties and descriptions is shared among all subscribers for each parentId, and is cleaned up as soon as all subscribers unsubscribe.

### States

The number of states is also greatly simplified, and removes the need for passing transactions through referendums, as the curator is the one that manages them.

![Child Bounties](/childBounties.png)

The SDK also exposes this with a union of ChildBounty types, which can be discriminated by `type`. Each of these types have only the methods available to their status.
