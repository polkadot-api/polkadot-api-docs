# Extension-based signers

In order to use an extension-based wallet, you can use the utilities exported at `polkadot-api/pjs-signer`.

Let's go step by step:

## Detect available extensions

Wallets announce themselves with a name through a global variable, and PAPI is able to detect them.

```ts twoslash
import { getInjectedExtensions } from "polkadot-api/pjs-signer"

const extensions = getInjectedExtensions() // [!code focus]
//    ^?
```

Once we get the available extensions by name, we can connect to them.

## Connect to extension

The extension will provide with a list of accounts available for usage. Note that, generally, the user will control which addresses are available.

```ts twoslash
import { getInjectedExtensions } from "polkadot-api/pjs-signer"

const extensions = getInjectedExtensions()

// ---cut---
import { connectInjectedExtension } from "polkadot-api/pjs-signer"

const selectedExtension = await connectInjectedExtension(extensions[0]) // [!code focus]
```

This returns a type `InjectedExtension`, with the following fields:

- `name`: `string`. Wallet identified, same one returned in `getInjectedExtensions`
- `disconnect`: `() => void`. Callback to close connection with the wallet.
- `getAccounts`: `() => InjectedPolkadotAccount[]{:ts}`. Get accounts available in that moment in time. [`InjectedPolkadotAccount`](/signers/extensions#use-polkadotsigner)
- `subscribe`: `(cb: (accounts: InjectedPolkadotAccount[]) => void) => () => void{:ts}`. Subscribe function accepting a callback that will be called every time the wallet announces account changes. Returns a function to unsubscribe. [`InjectedPolkadotAccount`](/signers/extensions#use-polkadotsigner)

## Use `PolkadotSigner`

Once we connected to the extension, we can get the accounts available through `getAccounts` or `subscribe` functions.

These accounts have `InjectedPolkadotAccount` type, with the following fields:

- `polkadotSigner`: [`PolkadotSigner`](/signers/polkadot-signer) ready to use.
- `address`: `string`. This comes from the wallet, it generally is an `AccountId32` (i.e. regular Polkadot accounts) or an `AccountId20` (i.e. Ethereum-like account).
- `genesisHash`: `(string | null)?`. The wallet optionally informs which `genesisHash` is supported for this address.
- `name`: `string?`. Optional name given by the wallet to the account (e.g. human-readable name given by the user).
- `type`: `string?`. Optional account type. The possible values are `"ed25519" | "sr25519" | "ecdsa" | "ethereum"`.

```ts twoslash
import { getInjectedExtensions } from "polkadot-api/pjs-signer"
import { connectInjectedExtension } from "polkadot-api/pjs-signer"

const extensions = getInjectedExtensions()
const selectedExtension = await connectInjectedExtension(extensions[0])

// ---cut---
let accountList = selectedExtension.getAccounts()
const unsubscribe = selectedExtension.subscribe((newAccounts) => {
  accountList = newAccounts
})

const firstSigner = accountList[0].polkadotSigner
const mySignature = await firstSigner.signBytes(Uint8Array.from([0, 1, 2, 3]))

// we call it if don't want to track account changes anymore
unsubscribe()
```
