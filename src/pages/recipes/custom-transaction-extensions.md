# Custom transaction extensions

Transaction extensions are part of an Extrinsic V5 transaction. A chain can use them to add data to a transaction, validate it, and produce a dispatch origin that is different from a regular signed account. PAPI deliberately leaves that chain-specific work to the [`TxCreator`](/signers/tx-creator).

This recipe uses the `peopleNext` descriptors generated from `wss://polkadot-test.substrate.dev/people`. That runtime has, among others, the custom `AsCoinage` and `AsResources` extensions.

## Choose the right approach

Use `customSignedExtensions` when the application already has the extension value for this one transaction. It is the shortest path: PAPI SCALE-encodes the value with the type from the generated descriptors and adds it to the payload.

Use a TxCreator enhancer when preparing the extension is reusable behavior. An enhancer can obtain data from a proof service or chain state, encode the extension, and declare that it handles the extension. The resulting creator no longer asks every call site for `customSignedExtensions`.

## One-off value: transfer a coin with `AsCoinage`

On the People test chain, `Coinage.transfer` requires a `Coin` origin. The `AsCoinage` extension creates that origin when its value is `AsCoin`. An app that already owns the coin does not need to calculate anything else for this extension, so `customSignedExtensions` is a good fit.

```ts twoslash
import { Enum, TypedApi } from "polkadot-api"
import { getVerifyMultiSignatureTxCreator } from "polkadot-api/tx-creator"
import { peopleNext } from "@polkadot-api/descriptors"

declare const publicKey: Uint8Array
declare const sign: (payload: Uint8Array) => Promise<Uint8Array>
declare const api: TypedApi<typeof peopleNext>

// This chain uses `VerifyMultiSignature` as its main authorization extension.
const txCreator = getVerifyMultiSignatureTxCreator(publicKey, "Sr25519", sign)

await api.tx.Coinage.transfer({
  to: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
}).createAndSubmit(txCreator, {
  customSignedExtensions: {
    // PAPI takes this typed value and encodes it using the `AsCoinage` type in
    // the descriptors. The extension turns the coin owner into `Origin::Coin`.
    AsCoinage: { value: Enum("AsCoin") },
  },
})
```

This is intentionally a per-call option. If every transaction from a creator needs `AsCoinage`, make that behavior part of the creator instead through an enhancer.

## Reusable behavior: add `CheckNonce`

`CheckNonce` is a standard transaction extension that prevents a transaction from being replayed. A creator normally obtains the next nonce from the chain, but callers may need to provide one themselves when coordinating a sequence of transactions.

This small enhancer does both. Its `nonce` option wins when supplied; otherwise it queries `AccountNonceApi_account_nonce` at the finalized block supplied through the TxCreator bindings.

PAPI's built-in creators already handle `CheckNonce`, and with a better implementation. This version is kept deliberately small to illustrate how an enhancer can read chain state and add a typed transaction option.

### Define the enhancer

```ts twoslash
import {
  decAnyMetadata,
  unifyMetadata,
  u32,
} from "@polkadot-api/substrate-bindings"
import {
  ArgsForArgSpecs,
  TxArgSpec,
  TxChainDefinition,
  TxCreatorEnhancer,
} from "@polkadot-api/tx-creator"
import { Binary } from "polkadot-api"
import { firstValueFrom } from "rxjs"

interface NonceArgSpec extends TxArgSpec {
  id: "CheckNonce"
  params: {
    /** Use this nonce instead of reading it from the chain. */
    nonce?: number
  }
}

export const withNonce =
  (publicKey: Uint8Array): TxCreatorEnhancer<[NonceArgSpec]> =>
  (inner) =>
  async (payload, opts, bindings, mocked) => {
    // If someone already filled in CheckNonce, don't change anything
    if (payload.extensions.some(({ id }) => id === "CheckNonce")) {
      return inner(payload, opts, bindings, mocked)
    }

    const metadata = unifyMetadata(decAnyMetadata(payload.context.metadata))
    const extension = metadata.extrinsic.extensions.CheckNonce
    if (!extension) return inner(payload, opts, bindings, mocked)

    const { nonce: providedNonce } = opts as ArgsForArgSpecs<
      [NonceArgSpec],
      TxChainDefinition
    >

    // Fetch the nonce from the chain
    const { finalized } = await firstValueFrom(bindings.blocks)
    const nonce =
      providedNonce ??
      u32.dec(
        await firstValueFrom(
          bindings.call(
            "AccountNonceApi_account_nonce",
            publicKey,
            finalized.hash,
          ),
        ),
      )

    // Call the next TxCreator with the modified payload containing the value for the extension
    return inner(
      {
        ...payload,
        extensions: [
          ...payload.extensions,
          {
            id: "CheckNonce",
            extra: Binary.toHex(u32.enc(nonce)),
            additionalSigned: "0x",
          },
        ],
      },
      opts,
      bindings,
      mocked,
    )
  }
```

### Use the enhanced creator

Start with the TxCreator that implements the chain's main authorization method, then wrap it once. The enhanced creator handles `CheckNonce`; callers only need to pass `nonce` when they want to override the chain value.

```ts
import { getVerifyMultiSignatureTxCreator } from "polkadot-api/tx-creator"
import { peopleNext } from "@polkadot-api/descriptors"
import { TypedApi } from "polkadot-api"

declare const publicKey: Uint8Array
declare const sign: (payload: Uint8Array) => Promise<Uint8Array>
declare const api: TypedApi<typeof peopleNext>

const baseTxCreator = getVerifyMultiSignatureTxCreator(
  publicKey,
  "Sr25519",
  sign,
)
const txCreator = withNonce(publicKey)(baseTxCreator)

const transfer = api.tx.Balances.transfer_keep_alive({
  dest: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
  value: 1_000_000_000n,
})

// Omit the options to use the nonce read from the latest finalized block.
await transfer.createAndSubmit(txCreator)

// Or provide the nonce when this transaction is part of a coordinated sequence.
await transfer.createAndSubmit(txCreator, { nonce: 42 })
```
