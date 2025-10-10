# Raw signer

PAPI provides a helper to build a [`PolkadotSigner`](/signers/polkadot-signer) instance directly from a raw signing function, provided by a cryptographic library, a hardware wallet, etc. It just deals with the chain logic side and leaves to the consumer the cryptographic signature part.

## `getPolkadotSigner`

It is a function to get a signer.

### Returns

[`PolkadotSigner`](/signers/polkadot-signer)

### Parameters

#### `publicKey`

Type: `Uint8Array{:ts}`

[`publicKey`](/signers/polkadot-signer#publickey) used to identify the signer.

#### `signingType`

Type: `"Ecdsa" | "Ed25519" | "Sr25519"{:ts}`

Signature schema used to sign.

#### `sign`

Type: `(input: Uint8Array) => Promise<Uint8Array> | Uint8Array{:ts}`

Cryptographic signature function, signing with the `signingType` previously declared.

## Examples

In these examples we use several libraries:

- [`@noble/curves`](https://npmjs.com/package/@noble/curves) `2.0.1`
- [`@noble/hashes`](https://npmjs.com/package/@noble/hashes) `2.0.1`
- [`@polkadot-labs/hdkd-helpers`](https://npmjs.com/package/@polkadot-labs/hdkd-helpers) `0.0.26`
- [`@polkadot-labs/hdkd`](https://npmjs.com/package/@polkadot-labs/hdkd) `0.0.25`
- [`@scure/sr25519`](https://npmjs.com/package/@scure/sr25519) `0.3.0`.
- [`polkadot-api`](https://npmjs.com/package/polkadot-api) `1.20.0`

Some snippets might work in other versions.

### Ed25519

```ts twoslash
import { getPolkadotSigner } from "polkadot-api/signer"
import { ed25519 } from "@noble/curves/ed25519.js"

const SECRET_KEY = new Uint8Array() // get your key

const signer = getPolkadotSigner(
  ed25519.getPublicKey(SECRET_KEY),
  "Ed25519",
  (i) => ed25519.sign(i, SECRET_KEY),
)
```

### Sr25519

#### From private key

```ts twoslash
import { getPolkadotSigner } from "polkadot-api/signer"
import * as sr25519 from "@scure/sr25519"

const SECRET_KEY = new Uint8Array() // get your key

const signer = getPolkadotSigner(
  sr25519.getPublicKey(SECRET_KEY),
  "Sr25519",
  (i) => sr25519.sign(SECRET_KEY, i),
)
```

#### From mnemonic phrase

This snippet helps to create a signer for `Alice`, `Bob`, `Charlie`, etc.

You can replace by your own mnemonic phrase.

```ts twoslash
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import {
  DEV_PHRASE,
  entropyToMiniSecret,
  mnemonicToEntropy,
} from "@polkadot-labs/hdkd-helpers"
import { getPolkadotSigner } from "polkadot-api/signer"

const miniSecret = entropyToMiniSecret(mnemonicToEntropy(DEV_PHRASE))
const derive = sr25519CreateDerive(miniSecret)
const hdkdKeyPair = derive("//Alice") // or `//Bob`, `//Charlie`, etc

const polkadotSigner = getPolkadotSigner(
  hdkdKeyPair.publicKey,
  "Sr25519",
  hdkdKeyPair.sign,
)
```

### Ecdsa

`Ecdsa` signer is an umbrella term for two types of signers using ECDSA signatures over Secpk1. In a glance, these are the two types:

- **EVM-like chains** (Moonbeam, Mythos, Darwinia, Crab, etc.) expect the signer to sign payloads using a **Keccak256 hash** and use **AccountId20** addresses (Ethereum-like addresses).
- **Polkadot-like chains** (e.g., Polkadot, Kusama) expect the signer to sign payloads using **Blake2_256** and use **AccountId32** addresses (Polkadot-like addresses).

With that distinction in mind, here's how you can create `Ecdsa` `PolkadotSigner`s for these different chain types:

#### Polkadot-like chains

```ts twoslash
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { blake2b } from "@noble/hashes/blake2.js"
import { getPolkadotSigner } from "polkadot-api/signer"

const SECRET_KEY = new Uint8Array() // get your key

const signer = getPolkadotSigner(
  blake2b(secp256k1.getPublicKey(SECRET_KEY), { dkLen: 32 }),
  "Ecdsa",
  (i) => {
    const signature = secp256k1.sign(blake2b(i, { dkLen: 32 }), SECRET_KEY, {
      prehash: false,
      format: "recovered",
    })
    return Uint8Array.from([...signature.slice(1), signature[0]])
  },
)
```

#### Ethereum-like chains

```ts twoslash
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { keccak_256 } from "@noble/hashes/sha3.js"
import { getPolkadotSigner } from "polkadot-api/signer"

const SECRET_KEY = new Uint8Array() // get your key

const signer = getPolkadotSigner(
  keccak_256(secp256k1.getPublicKey(SECRET_KEY, false).slice(1)).slice(-20),
  "Ecdsa",
  (i) => {
    const signature = secp256k1.sign(keccak_256(i), SECRET_KEY, {
      prehash: false,
      format: "recovered",
    })
    return Uint8Array.from([...signature.slice(1), signature[0]])
  },
)
```
