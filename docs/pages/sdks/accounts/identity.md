# Identity SDK

On-chain identity is usually hard to consume because the way that the data is structured and encoded.

The Identity SDK abstracts over this to provide a more dev-friendly interface.

## Getting Started

Install the Accounts SDK using your package manager:

```sh
npm i @polkadot-api/sdk-accounts
```

Then, initialize it by passing in the `typedApi` for your chain:

```ts
import { createIdentitySdk } from "@polkadot-api/sdk-accounts"
import { dot } from "@polkadot-api/descriptors"
import { getWsProvider } from "polkadot-api/ws-provider"
import { createClient } from "polkadot-api"

const client = createClient(
  getWsProvider("wss://polkadot-people-rpc.polkadot.io"),
)
const typedApi = client.getTypedApi(dot)

const identitySdk = createIdentitySdk(typedApi)
```

## Get on-chain identities

The SDK offers two functions:

- `getIdentity(address: SS58String): Promise<Identity | null>`
- `getIdentities(addresses: SS58String[]): Promise<Record<SS58String, Identity | null>>`

`getIdentities` is basically a batch of `getIdentity`.

`getIdentity` will fetch the information from the chain and provides:

- Each identity info (`email`, `display`, `github`, `twitter`, etc.) already decoded as strings
- The judgement information flattened out into a simple object `{ registrar: string, judgement: string, fee?: bigint }`
- A simple `verified` flag when the judgement is either `Reasonable` or `KnownGood`
- Will also resolve sub-identities: If an account is a sub-identity of another, the info will be of the parent identity, and has a property `subIdentity` with the name of that sub-identity.

Example:

```ts
const radiumBlock = await identitySdk.getIdentity(
  "13GtCixw3EZARj52CVbKLrsAzyc7dmmYhDV6quS5yeVCfnh1",
)

// name: RADIUMBLOCK.COM
console.log("name:", radiumBlock.info.display)
// verified: true
console.log("verified:", radiumBlock.verified)

const radiumBlock03 = await identitySdk.getIdentity(
  "14WBgUYr1scUwR5rvx7DwgMUhHtdtRyHMkurkU4AZ7wRgFxC",
)

// name: RADIUMBLOCK.COM
console.log("name:", radiumBlock03.info.display)
// verified: true
console.log("verified:", radiumBlock03.verified)
// subIdentity: 03
console.log("subIdentity:", radiumBlock03.subIdentity)
```
