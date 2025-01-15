# Referenda SDK

The Referenda SDK provides the following features:

- Abstraction over Preimages
  - When creating a referendum, it only generates a preimage if required by the length, significantly reducing deposit costs.
  - When reading a referendum, it resolves the calldata regardless of whether it's a preimage or not.
- Automatic Track Selection for Spender Referenda
  - Automatically selects the appropriate spender track for a referendum with a given value.
- Approval/Support Curves for Tracks
  - Provides approval/support curves as regular JavaScript functions, useful for creating charts.
  - Calculates the confirmation start and end blocks based on the current referendum results.

## Getting Started

Install the Governance SDK using your package manager:

```sh
npm i @polkadot-api/sdk-governance
```

Then, initialize it by passing in the `typedApi` for your chain:

```ts
import { createReferendaSdk } from '@polkadot-api/sdk-governance';
import { dot } from '@polkadot-api/descriptors';
import { getSmProvider } from 'polkadot-api/sm-provider';
import { chainSpec } from 'polkadot-api/chains/polkadot';
import { start } from 'polkadot-api/smoldot';
import { createClient } from 'polkadot-api';

const smoldot = start();
const chain = await smoldot.addChain({ chainSpec });

const client = createClient(getSmProvider(chain));
const typedApi = client.getTypedApi(dot);

const referendaSdk = createReferendaSdk(typedApi);
```

Different chains have their own spender track configurations, which unfortunately are hard-coded and not available on-chain. By default, the Referenda SDK uses Polkadot's configuration. For Kusama, you can import the Kusama configuration and pass it into the options parameter:

```ts
import { createReferendaSdk, kusamaSpenderOrigin } from '@polkadot-api/sdk-governance';

const referendaSdk = createReferendaSdk(typedApi, {
  spenderOrigin: kusamaSpenderOrigin
});
```

## Creating a Referendum

There are multiple origins to choose from when creating a referendum, each with [specific purposes](https://wiki.polkadot.network/docs/learn-polkadot-opengov-origins#origins-and-tracks-info).

For creating a referendum that requires a treasury spend, the SDK automatically selects the appropriate origin:

```ts
const beneficiaryAddress = "………";
const amount = 10_000_0000_000n;
const spendCall = typedApi.tx.Treasury.spend({
  amount,
  beneficiary: MultiAddress.Id(beneficiaryAddress)
});
const callData = await spendCall.getEncodedData();

const tx = referendaSdk.createSpenderReferenda(callData, amount);

// Submitting the transaction will create the referendum on-chain
const result = await tx.signAndSubmit(signer);
const referendumInfo = referendaSdk.getSubmittedReferendum(result);
if (referendumInfo) {
  console.log("Referendum ID:", referendumInfo.index);
  console.log("Referendum Track:", referendumInfo.track);
}
```

For non-spender referenda, you need to provide the origin:

```ts
const remarkCall = typedApi.tx.System.remark({
  remark: Binary.fromText("Make Polkadot even better")
});
const callData = await remarkCall.getEncodedData();

const tx = referendaSdk.createReferenda(
  PolkadotRuntimeOriginCaller.Origins(GovernanceOrigin.WishForChange()),
  callData
);

const result = await tx.signAndSubmit(signer);
const referendumInfo = referendaSdk.getSubmittedReferendum(result);
if (referendumInfo) {
  console.log("Referendum ID:", referendumInfo.index);
  console.log("Referendum Track:", referendumInfo.track);
}
```

When creating a referendum, if the call is short it can be inlined directly in the referendum submit call. Otherwise, it must be registered as a preimage. The SDK automatically handles this, inlining the call if possible or creating a batch transaction to register the preimage and submit the referendum with just one transaction.

## Fetching Ongoing Referenda

Closed referenda are mostly removed from the chain. The Referenda SDK lists ongoing referenda based from on-chain data:

```ts
const referenda: Array<OngoingReferendum> = await referendaSdk.getOngoingReferenda();
```

`OngoingReferendum` provides helpful methods to interact with proposals.

First of all, the proposal on a referendum can be inlined or through a preimage. `OngoingReferendum` unwraps this to get the raw call data or even the decoded call data:

```ts
console.log(referenda[0].proposal.rawValue); // PreimagesBounded
console.log(await referenda[0].proposal.resolve()); // Binary with the call data
console.log(await referenda[0].proposal.decodedCall()); // Decoded call data
```

You can also check when the referendum enters or finishes the confirmation phase:

```ts
console.log(await referenda[0].getConfirmationStart()); // number | null
console.log(await referenda[0].getConfirmationEnd());   // number | null
```

Lastly, there is some useful information that's not available on-chain, but through the public forums (e.g. OpenGov or subsquare). To fetch this information, like the referendum title, you can use a [Subscan API Key](https://support.subscan.io):

```ts
const apiKey = "………";
console.log(await referenda[0].getDetails(apiKey)); // { title: string }
```

## Accessing Track Details

Referendum tracks are runtime constants with specific properties for periods, approval, and support curves.

This SDK enhances the track by adding some helper functions to easily work with the curves.

You can get the track from an `OngoingReferendum` through the method `referendum.getTrack()`, or you can get one by id:

```ts
const referendumTrack = await referendum.getTrack();
const track = await referendaSdk.getTrack(5);
```

Then for both `minApproval` and `minSupport` curves, it adds functions to get the values at specific points of the curve:

```ts
// Raw curve data (LinearDescending, SteppedDecreasing or Reciprocal with parameters)
console.log(track.curve);

// Get the threshold [0-1] value when time is at 10th block.
console.log(track.getThreshold(10));

// Get the first block at which the threshold 50% happens
// Returns -Infinity if the curve starts at a lower threshold (meaning it has reached the threshold since the beginning)
// Returns +Infinity if the curve ends at a higher threshold (meaning it will never reach the threshold)
console.log(track.getBlock(0.5));

// Get Array<{ block:number, threshold: number }> needed to draw a chart.
// It will have the minimum amount of datapoints needed to draw a line chart.
console.log(track.getData());
```

