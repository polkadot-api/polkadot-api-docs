# `TxCreator`

`TxCreator` is the interface used by PAPI transaction methods that create an extrinsic. This page is meant for `TxCreator` implementers, and it goes into detail.

If you want to get a TxCreator from a wallet, check out [Browser Wallets](/signers/extensions). If you want to use a TxCreator, check out [Transactions](/typed/tx). If you want to get a TxCreator from a signing function, check out [Raw TxCreator](/signers/raw).

`TxCreator` does not assume the transaction is authorized by a classic account signature. Extrinsic V5 moves authorization into transaction extensions, so the creator is responsible for producing the full transaction using the authorization method required by the chain and the account.

```ts twoslash
import { Observable } from "rxjs"
// [!include ~/snippets/txPayload.ts]

type TxCreatorBindings = {
  blocks: Observable<
    | {
        type: "finalized"
        finalized: Block
        tips: Array<Block>
      }
    | {
        type: "newTip"
        finalized: Block
        tips: Array<Block>
        newTip: Block
      }
  >
  call: (call: string, args: Uint8Array, at: string) => Observable<Uint8Array>
  hasher: (payload: Uint8Array) => Observable<Uint8Array>
}

interface Block {
  hash: string
  number: number
  parent: string
}

// ---cut---
interface TxCreator<Specs extends TxArgSpec[]> {
  (
    input: TxPayloadV1,
    opts: Record<string, unknown>,
    bindings: TxCreatorBindings,
    mockedSignature: boolean,
  ): Promise<string>
}
```

This interface is based on the [`createTransaction` standard](https://github.com/polkadot-js/api/issues/6213). The first argument, `input: TxPayloadV1` is the same interface as defined in the standard, and the return value must be the final extrinsic.

`opts` is an object that contains the options passed by the consumer to create the transaction. This can be fully typed through the `TxArgSpec` parameter, which is also required to tell the client types which Transaction Extensions this TxCreator can handle. We go into more detail below.

`bindings` is an interface provided by the client that lets TxCreators access the chain. More details below.

Lastly, `mockedSignature` is a parameter used by the client to request a mocked extrinsic. This is used, for instance, when the consumer wants to estimate the fees without creating an extrinsic that could be submitted.

## TxCreatorBindings

The `TxCreatorBindings` interface is provided by the client and grants chain information to the TxCreator:

```ts twoslash
import { Observable } from "rxjs"

// ---cut---
type TxCreatorBindings = {
  blocks: Observable<
    | {
        type: "finalized"
        finalized: Block
        tips: Array<Block>
      }
    | {
        type: "newTip"
        finalized: Block
        tips: Array<Block>
        newTip: Block
      }
  >
  call: (call: string, args: Uint8Array, at: string) => Observable<Uint8Array>
  hasher: (payload: Uint8Array) => Observable<Uint8Array>
}

interface Block {
  hash: string
  number: number
  parent: string
}
```

`blocks` provides an Observable that constructs the current block tree, from the latest finalized block to the newer ones. It will start with a synchronous burst of emissions of `newTip`, announcing each block in parent-to-child order, with a `finalized` emission that signals the end of the state-of-the-world burst and which block is the finalized one.

It will continue emitting new tips and finalized events as the chain moves forward. Every emission also contains the latest known finalized block, and the list of tips (i.e. blocks above finalized with no children).

`call` is a function to perform a runtime call. The first argument is the Runtime API name (e.g. `AccountNonceApi_account_nonce`), the `args` parameter is the Runtime API arguments scale-encoded (according to the metadata, which is available in the `TxPayloadV1`), `at` is the target block, and the function returns the SCALE-encoded result.

Lastly, `hasher` is the hashing function used by the chain.

## Typings with `TxArgSpec`

Polkadot-API doesn't assume any Transaction Extension. It leaves handling all of them to the TxCreator interface. For this reason, if one were to use a `TxCreator` that declares it doesn't know about any Transaction Extension, PAPI will require the user to provide all of them through types.

The `TxCreator` interface has a generic `Specs extends TxArgSpec[]` that provides that information. It also lets `TxCreators` define what options they take or require through the `opts` parameter.

```ts twoslash
// [!include ~/snippets/txPayload.ts:txArgSpec]
```

Each `TxArgSpec` defines one Transaction Extension that the TxCreator handles, so PAPI won't require the user to provide the information for that extension.

When you want to define one of those, you don't need to provide the `chain` parameter. This parameter is actually used in the opposite direction: it is used in case you want to extract some types from the descriptors that the consumer will generate.

As an example, this is the TxArgSpec for the CheckNonce extension:

```ts twoslash
// [!include ~/snippets/txPayload.ts:txArgSpec]
interface TxCreator<Specs extends TxArgSpec[]> {}

// ---cut---
export interface NonceArgSpec extends TxArgSpec {
  id: "CheckNonce"
  params: {
    /**
     * Nonce for the transaction.
     * Default: higher nonce found in any tip of the chain.
     */
    nonce?: number
  }
}

type NonceAwareTxCreator = TxCreator<[NonceArgSpec]>
```

This TxCreator now declares it knows how to handle `CheckNonce`, and that it takes an optional parameter `nonce` in case the consumer wants to provide their own nonce.

## Well-Known Extensions

For the well-known extensions, `@polkadot-api/signers-common` provides a set of TxCreator enhancers that handle those extensions. It will also enhance the types so the resulting TxCreator has the appropriate `TxArgSpec` declarations.

So if your `TxCreator` doesn't require any custom transaction extension and is, for example, providing a Transaction V4 signature, you can use those enhancers to avoid having to re-implement them.

```ts twoslash
import { TxCreator } from "@polkadot-api/tx-creator"
import { withNonce, withCommonExtensions } from "@polkadot-api/signers-common"

const getMyCreator = (publicKey: Uint8Array) => {
  // [] declares this creator doesn't handle any TransactionExtension on its own.
  const innerCreator: TxCreator<[]> = async (
    payload,
    opts,
    bindings,
    mocked,
  ) => {
    // …
    return "0x…"
  }

  const creatorWithCommonExtensions = withNonce(publicKey)(
    withCommonExtensions(innerCreator),
  )

  // The creator we return knows about all common extensions
  return creatorWithCommonExtensions
}
```
