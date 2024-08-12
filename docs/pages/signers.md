# Signers

## `PolkadotSigner`

For transactions, the generated descriptors and its corresponding typed API are needed to create the transaction extrinsics, but for these transactions to be signed, we also need a signer, which is the responsible of taking it the call data and signing it.

Every method on Polkadot-API that needs to sign something, requires a `PolkadotSigner` with the following interface:

```ts
interface PolkadotSigner {
  publicKey: Uint8Array
  sign: (
    callData: Uint8Array,
    signedExtensions: Record<
      string,
      {
        identifier: string
        value: Uint8Array
        additionalSigned: Uint8Array
      }
    >,
    metadata: Uint8Array,
    atBlockNumber: number,
    hasher?: (data: Uint8Array) => Uint8Array,
  ) => Promise<Uint8Array>
}
```

This interface is generic to signing transactions for the chain.

### From a browser extension

If you want to use a compatible extension as a signer, Polkadot-API has a subpath with a couple of utilities to help with this: `polkadot-api/pjs-signer`.

```ts
import {
  getInjectedExtensions,
  connectInjectedExtension,
} from "polkadot-api/pjs-signer"

// Get the list of installed extensions
const extensions: string[] = getInjectedExtensions()

// Connect to an extension
const selectedExtension: InjectedExtension = await connectInjectedExtension(
  extensions[0],
)

// Get accounts registered in the extension
const accounts: InjectedPolkadotAccount[] = selectedExtension.getAccounts()

// The signer for each account is in the `polkadotSigner` property of `InjectedPolkadotAccount`
const polkadotSigner = accounts[0].polkadotSigner
```

### From a generic signing function

If you have a signer which takes some arbitrary data and just signs it with one of the supported algorithms, you can create a `PolkadotSigner` with the function `getPolkadotSigner` from `polkadot-api/signer`:

```ts
export function getPolkadotSigner(
  publicKey: Uint8Array,
  signingType: "Ecdsa" | "Ed25519" | "Sr25519",
  sign: (input: Uint8Array) => Promise<Uint8Array> | Uint8Array,
): PolkadotSigner
```

For example, using hdkd from `@polkadot-labs`:

```ts
import { sr25519CreateDerive } from "@polkadot-labs/hdkd";
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers";
import { getPolkadotSigner } from "polkadot-api/signer";

const entropy = mnemonicToEntropy(DEV_PHRASE);
const miniSecret = entropyToMiniSecret(entropy);
const derive = sr25519CreateDerive(miniSecret);
const hdkdKeyPair = derive("//Alice");

const polkadotSigner = getPolkadotSigner(
  hdkdKeyPair.publicKey,
  "Sr25519",
  hdkdKeyPair.sign
);
```
