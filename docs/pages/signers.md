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

Any crypto library that supports one of the three schemes would be supported, let's see examples with both `sr25519` and `ed25519` signing schemes, the most common among the three of them:

#### `ed25519`

```ts
import { ed25519 } from "@noble/curves/ed25519"
import { getPolkadotSigner } from "polkadot-api/signer"

const yourPrivateKey = new Uint8Array() // or an hex string
export const signer = getPolkadotSigner(
  ed25519.getPublicKey(yourPrivateKey),
  "Ed25519",
  (input) => ed25519.sign(input, yourPrivateKey),
)
```

#### `sr25519`

Using a private key:

```ts
import { sr25519 } from "@polkadot-labs/hdkd-helpers"
import { getPolkadotSigner } from "polkadot-api/signer"

const yourPrivateKey = new Uint8Array() // or an hex string
export const signer = getPolkadotSigner(
  sr25519.getPublicKey(yourPrivateKey),
  "Sr25519",
  (input) => sr25519.sign(input, yourPrivateKey),
)
```

Signer for a mnemonic (for example, Alice, Bob, etc):

```ts
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers"
import { getPolkadotSigner } from "polkadot-api/signer"

const entropy = mnemonicToEntropy(DEV_PHRASE)
const miniSecret = entropyToMiniSecret(entropy)
const derive = sr25519CreateDerive(miniSecret)
const hdkdKeyPair = derive("//Alice")

const polkadotSigner = getPolkadotSigner(
  hdkdKeyPair.publicKey,
  "Sr25519",
  hdkdKeyPair.sign,
)
```

#### `Ecdsa`

Creating an `Ecdsa` `PolkadotSigner` can be tricky, especially when dealing with different chains like Polkadot and EVM-like chains. Below is some code to illustrate how this can be done effectively.

##### Chain Differences in Signers

- **EVM-like chains** (Moonbeam, Mythos, Darwinia, Crab, etc.) expect the signer to sign payloads using a **Keccak256 hash** and use **AccountId20** addresses (Ethereum-like addresses).
- **Polkadot-like chains** (e.g., Polkadot, Kusama) expect the signer to sign payloads using **Blake2_256** and use **AccountId32** addresses (Polkadot-like addresses).

With that distinction in mind, here's how you can create `Ecdsa` `PolkadotSigner`s for these different chain types:

:::warning
The following code is for illustrative purposes only. It stores private keys in memory, which is not ideal from a security standpoint. You should refactor the code to meet the security standards of your environment.
:::

```ts
import { mnemonicToSeedSync } from "@scure/bip39"
import { HDKey } from "@scure/bip32"
import { getPolkadotSigner, type PolkadotSigner } from "polkadot-api/signer"
import { secp256k1 } from "@noble/curves/secp256k1"
import { keccak_256 } from "@noble/hashes/sha3"
import { blake2b256 } from "@noble/hashes/blake2b"

const signEcdsa = (
  hasher: (input: Uint8Array) => Uint8Array,
  value: Uint8Array,
  priv: Uint8Array,
) => {
  const signature = secp256k1.sign(hasher(value), priv)
  const signedBytes = signature.toCompactRawBytes()

  const result = new Uint8Array(signedBytes.length + 1)
  result.set(signedBytes)
  result[signedBytes.length] = signature.recovery

  return result
}

// A signer for EVM like chains that use AccountId20 as their public address
const getEvmEcdsaSigner = (privateKey: Uint8Array): PolkadotSigner => {
  const publicAddress = keccak_256(
    secp256k1.getPublicKey(privateKey, false).slice(1),
  ).slice(-20)

  return getPolkadotSigner(publicAddress, "Ecdsa", (iput) =>
    signEcdsa(keccak_256, input, privateKey),
  )
}

const getEvmEcdsaSignerFromMnemonic = (
  mnemonic: string,
  accountIdx: number = 0,
  password: string = "",
): PolkadotSigner => {
  const seed = mnemonicToSeedSync(mnemonic, password)
  const keyPair = HDKey.fromMasterSeed(seed).derive(
    `m/44'/60'/0'/0/${accountIdx}`,
  )
  return getEvmEcdsaSigner(keyPair.privateKey!)
}

// A signer for Polkadot like chains that use AccountId32 as the public address
const getPolkadotEcdsaSigner = (privateKey: Uint8Array): PolkadotSigner =>
  getPolkadotSigner(
    blake2b(secp256k1.getPublicKey(privateKey), { dkLen: 32 }),
    "Ecdsa",
    (input) => signEcdsa((i) => blake2b(i, { dkLen: 32 }), input, privateKey),
  )
```
