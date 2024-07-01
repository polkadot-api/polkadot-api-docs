# Transactions

Preparing, signing, and broadcasting extrinsics is one of the main purposes of polkadot-api. Every `typedApi.tx.Pallet.Call` has the following structure:

```ts
interface TxEntry<Arg> {
  (data: Arg): Transaction
  isCompatible: IsCompatible
}

type Transaction = {
  sign: TxSignFn
  signSubmitAndWatch: TxObservable
  signAndSubmit: TxPromise
  getEncodedData: TxCall
  getEstimatedFees: (
    from: Uint8Array | SS58String,
    txOptions?: TxOptions,
  ) => Promise<bigint>
  decodedCall: Enum
}
```

[We already know how `isCompatible` works](/typed#iscompatible). In order to get a `Transaction` object, we need to pass all arguments required by the extrinsic. Let's see two examples, `Balances.transfer_keep_alive` and `NominationPools.claim_payout`.

The case of `claim_payout` is the simplest one, since it doesn't take any arguments. Simply as

```ts
const tx: Transaction = typedApi.tx.NominationPools.claim_payout()
```

would do the trick. Let's see the other one, that takes arguments:

```ts
// MultiAddress is a first class citizen, and there's a special type for it
import { MultiAddress } from "@polkadot-api/descriptors"

const tx: Transaction = typedApi.tx.Balances.transfer_keep_alive({
  // these args are be strongly typed!
  dest: MultiAddress.Id("destAddressInSS58Format"),
  value: 10n ** 10n, // 1 DOT
})
```

Once we have a `Transaction` type, we're ready to see all methods that it have.

## `decodedCall`

The `decodedCall` field holds the `papi` way of expressing an extrinsic, decoded in an `Enum` type. It could be useful to pass it as call data to a `proxy.proxy` call, for example, that takes another call as a parameter:

```ts
import { MultiAddress } from "@polkadot-api/descriptors"

const tx: Transaction = typedApi.tx.Balances.transfer_keep_alive({
  dest: MultiAddress.Id("destAddressInSS58Format"),
  value: 10n ** 10n, // 1 DOT
})

const proxyTx = typedApi.tx.Proxy.proxy({
  real: MultiAddress.Id("proxyAddressInSS58Format"),
  call: tx.decodedCall,
  force_proxy_type: undefined,
})
```

## `getEncodedData`

`getEncodedData`, instead, packs the call data (without signed extensions, of course!) as a SCALE-encoded blob. It requires a `Runtime` field (like `isCompatible`). You can call without it, and it'll be a `Promise`-based call, or pass the runtime and it'll answer synchronously. Let's see an example:

```ts
// `getEncodedData` has this interface
interface TxCall {
  (): Promise<Binary>
  (runtime: Runtime): Binary
}

import { MultiAddress } from "@polkadot-api/descriptors"

const tx: Transaction = typedApi.tx.Balances.transfer_keep_alive({
  dest: MultiAddress.Id("destAddressInSS58Format"),
  value: 10n ** 10n, // 1 DOT
})

// without argument it's async!
const encodedTx = await tx.getEncodedData()

// with runtime argument it's sync!
const runtime = await typedApi.runtime.latest()
const encodedTx = tx.getEncodedData(runtime)
```

## `TxOptions`

All the methods that will follow sign the transaction (or fake-sign in the case of `getEncodedFees`). When signing a transaction, some optional `TxOptions` could be passed. Every one of them as a default, so it's not needed to pass them. Let's see and discuss them one by one:

```ts
type TxOptions<Asset> = Partial<
  void extends Asset
    ? {
        at: HexString | "best" | "finalized"
        tip: bigint
        mortality: { mortal: false } | { mortal: true; period: number }
        nonce: number
      }
    : {
        at: HexString | "best" | "finalized"
        tip: bigint
        mortality: { mortal: false } | { mortal: true; period: number }
        asset: Asset
        nonce: number
      }
>
```

- `at`: gives the option to choose which block to target when creating the transaction. Default: `finalized`
- `mortality`: gives the option to choose the mortality for the transaction. Default: `{ mortal: true, period: 64 }`
- `nonce`: this is meant for advanced users that submit several transactions in a row, it allows to modify the default `nonce`. Default: latest nonce from `finalized` block
- `tip`: add tip to transaction. Default: `0`
- `asset`: there're several chains that allow you to choose which asset to use to pay for the fees and tip. This field will be strongly typed as well and will adapt to every chain used in the `dApp`. Default: `undefined`. This means to use the native token from the chain.

## `getEstimatedFees`

With `getEstimatedFees` we make a call to the runtime and check how much would it cost to run a specific transaction. We need the address of the sender (or public key) and the `TxOptions` to construct a fake-signed transaction. We'll check the fees against the latest known `finalizedBlock`. Its interface is as follows:

```ts
type TxEstimateFees = (
  from: Uint8Array | SS58String,
  txOptions?: TxOptions<Asset>,
) => Promise<bigint>
```

## `sign`

As simple as it seems, this method packs the transaction, sends it to the signer, and receives the signature. It requires a [`PolkadotSigner`]("/signers"), we saw them in another section of the docs. Let's see its interface:

```ts
type TxSignFn = (
  from: PolkadotSigner,
  txOptions?: TxOptions,
) => Promise<HexString>
```

It'll get back the whole `SignedExtrinsic` that needs to be broadcasted. If the signer fails (or the user cancels the signature) it'll throw an error.

## `signAndSubmit`

`signAndSubmit` will sign (exactly the same way as `sign`) and then broadcast the transaction. If any error happens (both in the signing or if the transaction fails, i.e. wrong nonce, mortality period ended, etc) the promise will be rejected with an error. We're working to make this errors strongly typed. The promise will resolve as soon as the transaction is found in a finalized block, and will reject if the transaction fails. Note that this promise is not abortable. Let's see the interface:

```ts
type TxPromise = (
  from: PolkadotSigner,
  txOptions?: TxOptions,
) => Promise<TxFinalized>

type TxFinalized = {
  txHash: HexString
  ok: boolean
  events: Array<SystemEvent["event"]>
  block: { hash: string; number: number; index: number }
}
```

You get the `txHash`; the bunch of `events` that this extrinsic emitted (see [this section]("/typed/events") to see what to do with them); `ok` which simply tells if the extrinsic was successful (i.e. event `System.ExtrinsicSuccess` is found) and the `block` information where the tx is found.

## `signSubmitAndWatch`

`signSubmitAndWatch` is the Observable-based version of `signAndSubmit`. The function returns an Observable and will emit a bunch of events giving information about the status of transaction in the chain, until it'll be eventually finalized. Let's see its interface:

:::warning
The Observable is single cast, and it's not stateful. The transaction will be sent to signature, broadcasted, etc on every single subscription individually. If you want to share the subscription, you could craft an observable using `shareLatest`.
:::

```ts
export type TxObservable = (
  from: PolkadotSigner,
  txOptions?: TxOptions,
) => Observable<TxEvent>
```

`TxEvent` is divided in 4 different events:

```ts
type TxEvent = TxSigned | TxBroadcasted | TxBestBlocksState | TxFinalized
```

The first two are fairly straight-forward. As soon as the transaction gets signed, `TxSigned` will be emitted and the transaction will be broadcasted by the client. `TxBroadcasted` will be emitted then. This two events can only be emitted once each:

```ts
type TxSigned = { type: "signed"; txHash: HexString }
type TxBroadcasted = { type: "broadcasted"; txHash: HexString }
```

Then, as soon as the block is found in a `bestBlock` (or if the transaction is not valid anymore in the latest known bestBlock) the following event will be emitted:

```ts
type TxBestBlocksState = {
  type: "txBestBlocksState"
  txHash: HexString
} & (
  | {
      found: false
      isValid: boolean
    }
  | {
      found: true
      ok: boolean
      events: Array<SystemEvent["event"]>
      block: { hash: string; number: number; index: number }
    }
)
```

We can see that this is a 2-in-1 event. After the broadcast, the library will start verifying the state of the transaction against the latest known `bestBlock`. Then, two main situations could happen:

- The transaction is not found in the latest known `bestBlock`. If this is the case, polkadot-api will check if the transaction is still valid in the block. The event received in this case will be

```ts
interface TxBestBlockNotFound {
  type: "txBestBlocksState"
  txHash: HexString
  found: false
  isValid: boolean
}
```

- The transaction is found in the latest known `bestBlock`. We already infer that the transaction is valid in this block (otherwise it wouldn't get inside it). Therefore, we align the payload to the finalized event, and the event received is as follows. See the finalized event for more info on the fields.

```ts
interface TxBestBlockFound {
  type: "txBestBlocksState"
  txHash: HexString
  found: true
  ok: boolean
  events: Array<SystemEvent["event"]>
  block: { hash: string; number: number; index: number }
}
```

This event will be emitted any number of times. It might happen that the tx is found in a best block, then it disappears, comes back, etc. We'll pass all that information to the consumer.

Then, when the tx will be finalized, we'll emit the following event once and will complete the subscription.

```ts
type TxFinalized = {
  type: "finalized"
  txHash: HexString
  ok: boolean
  events: Array<SystemEvent["event"]>
  block: { hash: string; number: number; index: number }
}
```

At this stage, the transaction is valid and already in the canonical chain, in a finalized block. We pass, besides the `txHash` as in the other events, the following stuff:

- `ok`: it tells if the extrinsic was successful in its purpose. Under the hood it verifies if the event `System.ExtrinsicSuccess` is present.
- `events`: array of all events emitted by the extrinsic. They are ordered as emitted on-chain.
- `block`: information of the block where the `tx` is present. `hash` of the block, `number` of the block, `index` of the tx in the block.
