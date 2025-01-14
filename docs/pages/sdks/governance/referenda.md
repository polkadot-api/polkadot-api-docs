# Referenda SDK

The referenda SDK helps with the following:

- Abstract over preimages
    - When creating a referendum, it will only create a preimage if it's required by length, significantly reducing deposit costs.
    - When reading from a referendum, it resolves the calldata regardless if it's a preimage or not.
- Decide the best spender track for a referendum with a value.
    - Will always set the track to the appropriate value.
- Approval / Support curves for tracks
    - Provides them as regular JS functions, useful to create charts.
    - Calculates the confirmation start/end given block number for the current results of a referendum.

## Getting Started

Install the governance sdk through your package manager:

```sh
pnpm i @polkadot-api/sdk-governance
```

Then create it passing in the `typedApi` for your chain

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

Different chains come with different spender track configurations, which unfortunately is not available on-chain, but rather as hard-coded values. By default, referenda SDK will use the values from polkadot, but other chains might have others. To use kusama, you can import the kusama configuration and pass it into the options parameter:

```ts
import { createReferendaSdk, kusamaSpenderOrigin } from '@polkadot-api/sdk-governance';
const referendaSdk = createReferendaSdk(typedApi, {
  spenderOrigin: kusamaSpenderOrigin
});
```

## Create a referendum

There are many origins to choose when creating a referendum, each one have [specific purposes](https://wiki.polkadot.network/docs/learn-polkadot-opengov-origins#origins-and-tracks-info).

For creating a referendum that requires a treasury spend of a certain value, this Referenda SDK will choose the appropriate origin for you:

```ts
const beneficiaryAddress = "………";
const amount = 10_000_0000_000n;
const spendCall = typedApi.tx.Treasury.spend({
  amount,
  beneficiary: MultiAddress.Id(beneficiaryAddress)
});
const callData = await spendCall.getEncodedData();

const tx = referendaSdk.createSpenderReferenda(callData, amount);

// Submitting the tx will create the referendum on-chain
const result = await tx.signAndSubmit(signer);
const referendumInfo = referendaSdk.getSubmittedReferendum(result);
if (referendumInfo) {
    console.log("Referendum ID: ", referendumInfo.index);
    console.log("Referendum Track: ", referendumInfo.track);
}
```

In cases where you are not using a spender track, then you will need to provide the origin:

```ts
const remarkCall = typedApi.tx.System.remark({
  remark: Binary.fromText("Make polkadot even better")
})
const callData = await remarkCall.getEncodedData();

const tx = referendaSdk.createReferenda(
  PolkadotRuntimeOriginCaller.Origins(GovernanceOrigin.WishForChange()),
  callData
);

const result = await tx.signAndSubmit(signer);
const referendumInfo = referendaSdk.getSubmittedReferendum(result);
if (referendumInfo) {
    console.log("Referendum ID: ", referendumInfo.index);
    console.log("Referendum Track: ", referendumInfo.track);
}
```

When creating a referendum, if the call is not too long it can be inlined in the same referendum submit call, otherwise it needs to be registered as a preimage.

The Referenda SDK for both cases (createReferenda and createSpenderReferenda) will inline the call as long as the call data falls within that limit, otherwise it will automatically create a batch call that will do both creating the preimage and submitting the referendum with the same transaction.

## Get ongoing referenda

Referenda get mostly removed from chain once they are closed. Referenda SDK relies with on-chain data, so currently it will list the ongoing referenda from on-chain data.

```ts
const referenda: Array<OngoingReferendum> = await referendaSdk.getOngoingReferenda();
```

`OngoingReferendum` represents an ongoing referendum, and adds a few methods to work with it.

First of all, the proposal on a referendum can be inlined or through a preimage. `OngoingReferendum` unwraps this to get the raw call data or even the decoded call data:

```ts
console.log(referenda[0].proposal.rawValue) // PreimagesBounded
console.log(await referenda[0].proposal.resolve()) // Binary with the call data
console.log(await referenda[0].proposal.decodedCall()) // Decoded call data
```

It also adds a couple of functions to get the expected block this referendum will enter confirmation or finish confirmation:

```ts
console.log(await referenda[0].getConfirmationStart()) // number | null
console.log(await referenda[0].getConfirmationEnd()) // number | null
```

Lastly, there is some useful information that's not available on-chain, but through the public forums (e.g. OpenGov or subsquare). To get the title of a referendum, the one you would see in either of the forums, you can use a [Subscan API Key](https://support.subscan.io) to fetch that information for you:

```ts
const apiKey = "………";
console.log(await referenda[0].getDetails(apiKey)) // { title: string }
```

## Get track details

The track for a referendum is a runtime constant that contains the name and different values for the period and minimum approval and support curves.

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

