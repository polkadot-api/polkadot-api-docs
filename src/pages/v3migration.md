# Migrate to V3

PAPI v3 adds first-class support for general transactions and Extrinsic V5. For most applications, the migration from v2 is intentionally small: update the transaction terminology from signing to creating. The `PolkadotSigner` interface has been replaced by the `TxCreator` interface, but all PAPI signers are updated, so if you just passed the signer to "sign" functions, then passing the same variable to the respective "create" functions will work.

The reason for the rename is that creating a transaction does not always require a signature anymore. Extrinsic V5 moves authorization into transaction extensions, so a transaction can be authorized by mechanisms other than a classic account signature.

## Quick migration

### Transaction methods

The transaction methods were renamed to describe the new action:

| v2                   | v3                     |
| -------------------- | ---------------------- |
| `sign`               | `create`               |
| `signAndSubmit`      | `createAndSubmit`      |
| `signSubmitAndWatch` | `createSubmitAndWatch` |

```ts
// v2
await tx.sign(signer)
await tx.signAndSubmit(signer)
tx.signSubmitAndWatch(signer).subscribe(...)

// v3
await tx.create(txCreator)
await tx.createAndSubmit(txCreator)
tx.createSubmitAndWatch(txCreator).subscribe(...)
```

The result of these functions is still the same as before. The new naming just avoids assuming that the authorization step is always a signature.

### TxCreator imports

The signer entrypoint was renamed:

```ts
// v2
import { ... } from "polkadot-api/signer"

// v3
import { ... } from "polkadot-api/tx-creator"
```

`PolkadotSigner` has been replaced by `TxCreator`. Anywhere an application passed a signer to a transaction method should now pass the corresponding `TxCreator`.

### Transaction events

`createSubmitAndWatch` still emits transaction progress events, but two event names changed.

The old `signed` event is now `created`:

```ts
// v2
if (event.type === "signed") {
  console.log(event.txHash)
}

// v3
if (event.type === "created") {
  console.log(event.txHash)
}
```

The old `txBestBlocksState` event was split into two event types. Instead of checking `found`, switch on `inBestBlock` and `notInBestBlock`:

```ts
// v2
if (event.type === "txBestBlocksState" && event.found) {
  console.log(event.block)
}

if (event.type === "txBestBlocksState" && !event.found) {
  console.log(event.txHash)
}

// v3
if (event.type === "inBestBlock") {
  console.log(event.block)
}

if (event.type === "notInBestBlock") {
  console.log(event.txHash)
}
```

`inBestBlock` carries the data that used to be present when `txBestBlocksState.found` was `true`: `txHash`, `ok`, `events`, optional `dispatchError`, and `block`. `notInBestBlock` replaces the previous `found: false` state and carries the `txHash`, and the transaction goes back to broadcasting state.

### Fee estimation

`getPaymentInfo` and `getEstimatedFees` now take a `TxCreator` instead of an account address or public key:

```ts
// v2
const paymentInfo = await tx.getPaymentInfo(address)
const fees = await tx.getEstimatedFees(address)

// v3
const paymentInfo = await tx.getPaymentInfo(txCreator)
const fees = await tx.getEstimatedFees(txCreator)
```

PAPI v2 could estimate fees from an address by building a fake signer internally. With general transactions, PAPI cannot infer the expected extrinsic type or authorization method from an address alone. `TxCreator` supports fake signing, so fee estimation still does not require a real user signature.

If you don't have access to a TxCreator and want to estimate fees based just on an address, v3 exports `getFakeTxCreator(address): TxCreator`.

### Multisig signer

The multisig signer from `@polkadot-api/meta-signers` removed one of the arguments: `txPaymentInfo`.

TxCreators now have direct access to runtime APIs, so passing in this argument is no longer needed.

```ts
// v2
const multisigSigner = getMultisigSigner(
  {
    threshold: 2,
    signatories: addrs,
  },
  api.query.Multisig.Multisigs.getValue,
  api.apis.TransactionPaymentApi.query_info,
  mySigner,
)

// v3
const multisigTxCreator = getMultisigTxCreator(
  {
    threshold: 2,
    signatories: addrs,
  },
  api.query.Multisig.Multisigs.getValue,
  mySigner,
)
```

## Descriptors and chain definitions

Regenerate your descriptors after upgrading. In v3, `ChainDefinition` includes all extensions, and generated descriptors include non-default extensions too.

For normal applications this should only mean running codegen again. If you have custom tooling that reads descriptor internals or builds `ChainDefinition` objects manually, update it so it does not assume only default extensions are present.

## Signer implementations

Previously, `PolkadotSigner` was an interface containing three properties: `signTx`, `signBytes` and `publicKey`. This has been replaced by `TxCreator`, which is an enhanced version of [createTransaction](https://github.com/polkadot-js/api/issues/6213).

TxCreator doesn't assume the authorization method, so it doesn't have any of the sign-specific properties. When migrating, it's recommended that your signer exports a `TxCreator & { publicKey: Uint8Array, signBytes: SignFn }`, along with other properties that might be useful for a consumer.

PAPI no longer supplies the information for well-known transaction extensions such as `CheckGenesis`, `CheckSpecVersion`, `CheckNonce` and any other. This is now the responsibility of the `TxCreator`.

The `TxCreator` interface provides all the information needed to fill in those values, as well as access to runtime APIs and the information of the active blocks. `@polkadot-api/signers-common` exports the enhancers `withNonce(pubKey: Uint8Array)` and `withCommonExtensions` so you don't need to re-implement those well-known extensions, but it's all built in a way which allow creating TxCreators with custom transaction extensions.

Additionally, the interface is fully typed. When the codegen generates the descriptors for a chain, it detects which transaction extensions are required and stores that within the descriptors. Then, by default, PAPI will require the developer to fill in all those extensions (even the well-known ones). `TxCreator` has a generic that tells which transaction extensions it knows about, so that when using it PAPI will not require the user to provide the data for those transaction extensions anymore.

This is explained in detail in the TxCreator documentation page, but to support the well-known extensions when migrating, you should pass the common type from `@polkadot-api/signers-common` to the TxCreator generic: `TxCreator<CommonEnhancersSpecs>`
