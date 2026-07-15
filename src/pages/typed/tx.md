# Transactions

Preparing, signing, and broadcasting extrinsics is one of the main purposes of `polkadot-api`. There are two ways to create transactions in PAPI, and will see both of them in this page.

## `tx.Pallet.Call`

In order to create a transaction directly in PAPI (without a pre-made call data) use the object `typedApi.tx`. Every `typedApi.tx.Pallet.Call` available in the chain has the following structure:

```ts
interface TxEntry<Arg> {
  (data: Arg): Transaction
}
```

In order to get a `Transaction` object, we need to pass all arguments required by the extrinsic. Let's see two examples, `Balances.transfer_keep_alive` and `NominationPools.claim_payout`.

The case of `claim_payout` is the simplest one, since it doesn't take any arguments. Simply as

```ts
const tx: Transaction = typedApi.tx.NominationPools.claim_payout()
```

would do the trick. Let's see the other one, that takes arguments:

```ts
// MultiAddress is a first class citizen, and there's a special type for it
import { MultiAddress } from "@polkadot-api/descriptors"

const tx: Transaction = typedApi.tx.Balances.transfer_keep_alive({
  // these args are strongly typed!
  dest: MultiAddress.Id("destAddressInSS58Format"),
  value: 10n ** 10n, // 1 DOT
})
```

## `txFromCallData`

This option will just take a binary call data and pack the transaction from it. It will validate the input when creating it, throwing an error otherwise.

Its interface is:

```ts
interface TxFromBinary {
  (callData: Uint8Array): Promise<Transaction>
}
```

Very simple. Let's see it with an example:

```ts
const callData = Binary.fromHex("0x00002c50415049203c3320444f54")

const tx: Transaction = await api.txFromCallData(callData)
```

A synchronous version of this method is available in [Static APIs](/static#txfromcalldata).

## `Transaction` type

Both methods of creating transactions in PAPI output a `Transaction` type, that has the following interface:

```ts
type Transaction = {
  // Create the transaction using the TxCreator, get the transaction ready to broadcast
  create<T extends TxCreator>(
    creator: T,
    txOptions?: TxCreatorOptions<T, Chain>,
  ): Promise<Uint8Array>

  // Create the transaction using the TxCreator, submit it and get submission progress events
  createSubmitAndWatch<T extends TxCreator>(
    creator: T,
    txOptions?: TxCreatorOptions<T, Chain>,
  ): Observable<TxEvent>

  // Create the transaction using the TxCreator, submit it and get the finalized result.
  createAndSubmit<T extends TxCreator>(
    creator: T,
    txOptions?: TxCreatorOptions<T, Chain>,
  ): Promise<TxFinalizedPayload>

  // Get the callData encoded in SCALE using the chain's metadata
  getEncodedData(): Promise<Uint8Array>

  // Get the unsigned extrinsic
  getBareTx(): Promise<Uint8Array>

  // Get the estimated weight, class, fees, etc. of the transaction
  getPaymentInfo<T extends TxCreator>(
    creator: T,
    txOptions?: TxCreatorOptions<T, Chain>,
  ): Promise<PaymentInfo>

  // Get the estimated fees of the transaction
  getEstimatedFees<T extends TxCreator>(
    creator: T,
    txOptions?: TxCreatorOptions<T, Chain>,
  ): Promise<bigint>

  // Decoded call data: { type: string, value: { type: string, value: T }}
  decodedCall: TxCallData
}
```

We will see item by item its content.

In the snippets of this page, `Chain` stands for the chain extension information generated in the descriptors. When using it, TypeScript infers it from the typed API.

### `decodedCall`

The `decodedCall` field holds the `papi` way of expressing an extrinsic, decoded in an `Enum` type. It could be useful to pass it as call data to a `proxy.proxy` call, or a batch call, for example, that takes another call as a parameter:

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

### `getEncodedData`

`getEncodedData`, instead, packs the call data (without transaction extensions, of course!) as a SCALE-encoded blob. Let's see an example:

```ts
import { MultiAddress } from "@polkadot-api/descriptors"

const tx: Transaction = typedApi.tx.Balances.transfer_keep_alive({
  dest: MultiAddress.Id("destAddressInSS58Format"),
  value: 10n ** 10n, // 1 DOT
})

const encodedTx = await tx.getEncodedData()
```

A synchronous version of this method is available in [Static APIs](/static#tx).

### `TxCreatorOptions`

All the methods that create an extrinsic take a [`TxCreator`](/signers/tx-creator). The options accepted by those methods are inferred from two things: the chain extensions in the generated descriptors, and the extensions handled by the `TxCreator`.

```ts
type TxCreateFn = <T extends TxCreator>(
  creator: T,
  txOptions?: TxCreatorOptions<T, Chain>,
) => Promise<Uint8Array>
```

The `TxCreator` sets which options it takes. For most cases, these options look familiar, though the exact type changes per chain and per creator.

- `at`: gives the option to choose which block to target the mortality when creating the transaction. This means that the transaction will be valid only on descendants of that block. Defaults to the latest finalized block.
- `mortality`: gives the option to choose the mortality for the transaction. Default: `{ mortal: true, period: 64 }`. The `period` will be rounded to the first power of two greater or equal to it.
- `nonce`: this is meant for advanced users that submit several transactions in a row, it allows to modify the default `nonce`. Default: highest nonce found in any known block.
- `tip`: add tip to transaction. Default: `0`
- `asset`: there're several chains that allow you to choose which asset to use to pay for the fees and tip. This field will be strongly typed as well and will adapt to every chain used in the `dApp`. Default: `undefined`. This means to use the native token from the chain.

If a chain has transaction extensions that the `TxCreator` does not handle, PAPI will ask for those values through `customSignedExtensions`:

```ts
type CustomSignedExtensions = Record<
  string,
  {
    value?: unknown
    additionalSigned?: unknown
  }
>
```

This is fully typed from the generated descriptors, so custom extension values are required only when the selected `TxCreator` does not already know how to provide them.

### `getEstimatedFees`

With `getEstimatedFees` we make a call to the runtime and check how much would it cost to run a specific transaction. We need a `TxCreator` because the fee depends on the transaction extensions and authorization method. The creator will be asked to mock the authorization, so the user does not need to approve a real transaction just to estimate fees. We'll check the fees against the latest known `finalizedBlock`. Its interface is as follows:

```ts
type TxEstimateFees = <T extends TxCreator>(
  creator: T,
  txOptions?: TxCreatorOptions<T, Chain>,
) => Promise<bigint>
```

`getPaymentInfo` works the same way, but returns the full payment information including weight and class:

```ts
type TxGetPaymentInfo = <T extends TxCreator>(
  creator: T,
  txOptions?: TxCreatorOptions<T, Chain>,
) => Promise<PaymentInfo>
```

### `getBareTx`

This method packs the transaction as a `Bare`/`Unsigned` transaction. It will prefer Extrinsic V5 if available, and fall back to Extrinsic V4. Its interface is straight-forward:

```ts
interface TxBare {
  (): Promise<Uint8Array>
}
```

It'll get back the `BareExtrinsic` ready to be broadcasted as a `Uint8Array`. Extrinsics can be submitted separately through [client.submit](/client#submit) or [client.submitAndWatch](/client#submitAndWatch)

### `create`

This method packs the transaction and sends it to the [`TxCreator`](/signers). For account-based creators, this usually means signing. For general transactions, the authorization method depends on the transaction extensions. Let's see its interface:

```ts
type TxCreateFn = <T extends TxCreator>(
  creator: T,
  txOptions?: TxCreatorOptions<T, Chain>,
) => Promise<Uint8Array>
```

It'll get back the whole extrinsic as a `Uint8Array` that needs to be broadcasted. If the creator fails (or the user cancels the authorization) it'll throw an error.

Created extrinsics can be submitted separately through [client.submit](/client#submit) or [client.submitAndWatch](/client#submitAndWatch)

### `createAndSubmit`

`createAndSubmit` will create the transaction (exactly the same way as [`create`](#create)). After creating it will validate the transaction against the block specified in `txOptions` and broadcast the transaction if it is valid. If it is not it will throw an [`InvalidTxError`](#invalidtxerror).

- The promise will resolve as soon as the transaction is found in a finalized block.
- The promise will reject if the transaction is invalid at any finalized block after broadcasting. It will throw as well an [`InvalidTxError`](#invalidtxerror).

Note that this promise is not abortable. Let's see the interface:

```ts
type TxCreateAndSubmitFn = <T extends TxCreator>(
  creator: T,
  txOptions?: TxCreatorOptions<T, Chain>,
) => Promise<TxFinalized>

type TxFinalized = {
  txHash: HexString
  ok: boolean
  events: Array<SystemEvent["event"]>
  dispatchError?: DispatchError
  block: { hash: string; number: number; index: number }
}
```

You get the `txHash`; the bunch of `events` that this extrinsic emitted (see [this section](/typed/events) to see what to do with them); `ok` which simply tells if the extrinsic was successful (i.e. event `System.ExtrinsicSuccess` is found), with its [`dispatchError`](#dispatcherror) and the `block` information where the tx is found.

### `createSubmitAndWatch`

`createSubmitAndWatch` is the Observable-based version of `createAndSubmit`. The function returns an Observable and will emit a bunch of events giving information about the status of transaction in the chain, until it'll be eventually finalized or definitely invalid. Let's see its interface:

:::warning
The Observable is single cast, and it's not stateful. The transaction will be sent to the creator, broadcasted, etc on every single subscription individually. If you want to share the subscription, you could craft an observable using `shareLatest`.
:::

```ts
export type TxObservable = <T extends TxCreator>(
  creator: T,
  txOptions: TxCreatorOptions<T, Chain>,
) => Observable<TxEvent>
```

`TxEvent` is divided in 4 different events:

```ts
type TxEvent =
  TxCreated | TxBroadcasted | TxInBestBlock | TxNotInBestBlock | TxFinalized
```

The first two are fairly straight-forward. Let's see them.

First of all, the transaction will be created (exactly the same way as [`create`](#create)) and the event `TxCreated` will be emitted. As soon as the transaction gets created, the transaction will be validated against the block specified in `txOptions` and, if it is valid, the transaction will be broadcasted and `TxBroadcasted` will be emitted then. If the transaction is invalid the observable will error with an [`InvalidTxError`](#invalidtxerror).

These two events can only be emitted once each:

```ts
type TxCreated = { type: "created"; txHash: HexString }
type TxBroadcasted = { type: "broadcasted"; txHash: HexString }
```

After the broadcast, the library will start verifying the state of the transaction against some best blocks in a smart way. Then, as soon as the block is found in a `bestBlock` the following event will be emitted:

```ts
type TxInBestBlock = {
  type: "inBestBlock"
  txHash: HexString
  ok: boolean
  events: Array<SystemEvent["event"]>
  dispatchError?: DispatchError
  block: { hash: string; number: number; index: number }
}
```

The best block isn't finalized yet, so re-orgs might happen. In case this happens after the transaction was found in a best block, the observable will emit a `notInBestBlock` event:

```ts
type TxNotInBestBlock = { type: "notInBestBlock"; txHash: HexString }
```

And the broadcast / search will resume, emitting a new `inBestBlock` event if the transaction is included in a different new best block.

These events might be emitted any number of times. It might happen that the tx is found in a best block, then this block gets pruned and is not anymore in the new best block branch, comes back, etc. PAPI passes all that information to the consumer.

Lastly, two things can happen. The first one is that the tx gets in a block that becomes finalized. In this case we will emit the following event once and will complete the subscription.

```ts
type TxFinalized = {
  type: "finalized"
  txHash: HexString
  ok: boolean
  events: Array<SystemEvent["event"]>
  dispatchError?: DispatchError
  block: { hash: string; number: number; index: number }
}
```

At this stage, the transaction is valid and already in the canonical chain, in a finalized block. We pass, besides the `txHash` as in the other events, the following stuff:

- `ok`: it tells if the extrinsic was successful in its purpose. Under the hood it basically checks that the event `System.ExtrinsicFailed` was not emitted.
- `events`: array of all events emitted by the extrinsic. They are ordered as emitted on-chain.
- `dispatchError`: in case the transaction failed, this will have the `dispatchError` value of `System.ExtrinsicFailed`. Read more about it in [`DispatchError`](#dispatcherror)
- `block`: information of the block where the `tx` is present. `hash` of the block, `number` of the block, `index` of the tx in the block.

On the other hand, if the transaction is invalid in any finalized block after the broadcasting the observable will error with an [`InvalidTxError`](#invalidtxerror).

### `InvalidTxError`

When a transaction is deemed as invalid (due to, for example, wrong nonce, expired mortality, not enough balance to pay the fees, etc) we provide a strongly typed error. It can be used as follows:

```ts
import { InvalidTxError, TransactionValidityError } from "polkadot-api"
import { myChain } from "@polkadot-api/descriptors"

tx.createAndSubmit(txCreator)
  .then(() => "tx went well")
  .catch((err) => {
    if (err instanceof InvalidTxError) {
      const typedErr: TransactionValidityError<typeof myChain> = err.error
      console.log(typedErr)
    }
  })

// it is available, of course, for observable-based broadcasting
tx.createSubmitAndWatch(txCreator).subscribe({
  error: (err) => {
    if (err instanceof InvalidTxError) {
      const typedErr: TransactionValidityError<typeof myChain> = err.error
      console.log(typedErr)
    }
  },
})
```

This `typedErr` will be, then, strongly typed as any other type coming from PAPI. Its content might differ per chain, but it enables the developer to get the information required and act accordingly.

:::info
This error will only be available for chains with Runtime Metadata `v15` or greater.

In case you are using the whitelist feature of the codegen, remember to add `"api.TaggedTransactionQueue.validate_transaction"` to the list of whitelisted interactions.
:::

### `DispatchError`

In Polkadot, a transaction can be valid (and therefore not to throw the `InvalidError`) but the inner extrinsic fail. In this case, the event `ExtrinsicFailed` gives all the information required to understand why it failed. We also expose a `dispatchError` field that helps to guess why it failed. Better a picture than a thousand words:

```ts
// `Chain` will change depending on the name you gave the chain
// in the codegen
import { ChainDispatchError } from "@polkadot-api/descriptors"
tx.createSubmitAndWatch(txCreator).subscribe((ev) => {
  if (ev.type === "finalized" || (ev.type === "inBestBlock" && ev.found)) {
    // here we are sure that the transaction is in a block (whether finalized or bestBlock)
    // with `ok` we know the extrinsic failed
    if (!ev.ok) {
      const err: ChainDispatchError = ev.dispatchError
      // you will have a strongly typed object that you can keep narrowing down
      // to find the root of the issue
      if (err.type === "Module" && err.value.type === "Balances")
        "keep checking..."
    }
  }
})
```

:::info
In case you are using the whitelist feature of the codegen, remember to add `"event.System.ExtrinsicFailed"` to the list of whitelisted interactions.
:::
