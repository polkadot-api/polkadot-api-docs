# Multisig SDK

Working with multisig calls is a bit complex, since the call to make depends on the status of the other signatories. The Multisig SDK simplifies this, by offering a function that wraps any transaction into a multisig call.

## Getting Started

Install the Multisig SDK using your package manager:

```sh
npm i @polkadot-api/sdk-multisig
```

Then, initialize it by passing in the `client` for your chain:

```ts
import { createMultisigSdk } from "@polkadot-api/sdk-multisig"
import { getWsProvider } from "polkadot-api/ws-provider"
import { createClient } from "polkadot-api"

const client = createClient(getWsProvider("wss://rpc.ibp.network/polkadot"))

const multisigSdk = createMultisigSdk(client)
```

:::note
By default, it uses `SS58` accounts. If you are using a chain that uses AccountId20, then pass the optional parameter `"acc20"`.
:::

## Describing a multisig

All high-level operations use the `MultisigAccount` shape:

```ts
const multisig = {
  signatories: ["5FHneW46xGX...", "5DAAnrj7VHT..."],
  threshold: 2,
}
```

## Multisig signer

The simpler way of wrapping transactions is if you have the signer for one of the members of the multisig. Then you can wrap that signer into a "Multisig signer":

```ts
const multisigSigner = multisigSdk.getMultisigSigner(multisig, signer)

// Then when you use `multisigSigner` instead of `signer`, the transaction will be wrapped as a multisig call instead.
const tx = typedApi.tx.System.remark({ data: Binary.fromText("Hello!"); })
tx.signAndSubmit(multisigSigner)
```

## Wrapping a transaction

The other option, if you don't want to sign the transaction straight away, is to just wrap another transaction. In this case, you must also provide the signatory address that will submit that transaction:

```ts
const multisigTx = multisigSdk.getMultisigTx(
  multisig,
  // Your signatory address
  "5FHneW46xGX...",
  tx,
)
```

## Dispatch strategy

By default, the SDK looks up the existing multisig approvals and chooses the appropriate pallet call:

- When `threshold === 1`, the SDK uses `as_multi_threshold_1` directly to dispatch the call.
- If the multisig is not ready yet (missing more signatories), it uses `approve_as_multi`, which saves some fees.
- Otherwise it uses `as_multi`, which signals that the multisig has enough signatures and dispatches it.

You can customise this behaviour with the optional parameter:

```ts
const wrapped = getMultisigTx(multisig, signer, tx, {
  method: (
    // Current list of approvals, which of the other members have already signed SS58String[]
    approvals,
    // Threshold of the multisig
    threshold,
  ) => {
    // Whatever strategy you want here
    return "as_multi"
  },
})
```
