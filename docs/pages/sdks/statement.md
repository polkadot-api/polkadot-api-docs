# Statement SDK

The [Statement Store](https://github.com/paritytech/polkadot-sdk/tree/49bd017a06989799141af0809c0fbdd48d67b733/substrate/primitives/statement-store) primitive is an off-chain data store for signed messages (known as statements) accessible via RPC.

## Getting Started

Install the Statement SDK using your package manager:

```sh
pnpm i @polkadot-api/sdk-statement
```

The function `createStatementSdk` takes a simple request-response function, which is expected to implement the [Statement JSON-RPC API](https://github.com/paritytech/polkadot-sdk/tree/49bd017a06989799141af0809c0fbdd48d67b733/substrate/client/rpc-api/src/statement).

The actual interface of the function is

```ts
type RequestFn = (method: string, params: Array<any>) => Promise<any>
```

The property `_request` of a [client](/client) can be used for this matter.

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const client = createClient(
  getWsProvider("wss://paseo-people-next-rpc.polkadot.io"),
)

import { createStatementSdk } from "@polkadot-api/sdk-statement" // [!code focus]

const statementSdk = createStatementSdk(client._request) // [!code focus]
```

## Get Statements

### Get Complete Store (`dump`)

The function dump will get all statements from the provider's store. Note that this endpoint might be rate-limited in some cases.

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { createStatementSdk } from "@polkadot-api/sdk-statement" // [!code focus]
const client = createClient(
  getWsProvider("wss://paseo-people-next-rpc.polkadot.io"),
)
const statementSdk = createStatementSdk(client._request) // [!code focus]
// ---cut---
// all currently available statements of that node.
const statements = await statementSdk.dump()
```

### Get Filtered Statements (`getStatements`)

This function will query for filtered statements by `topic` and/or `dest` key (find meaning in [Statement Store docs](https://github.com/paritytech/polkadot-sdk/tree/49bd017a06989799141af0809c0fbdd48d67b733/substrate/primitives/statement-store).

#### Parameters

- `dest`: `Binary` for specific dest key. `null` for no dest key. `undefined` to disable filtering by `dest`
- `topics`: Array of up to 4 topics to filter by.

```ts twoslash
import { createClient, Binary } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { createStatementSdk } from "@polkadot-api/sdk-statement"
const client = createClient(
  getWsProvider("wss://paseo-people-next-rpc.polkadot.io"),
)
const statementSdk = createStatementSdk(client._request)
// ---cut---
import { stringToTopic } from "@polkadot-api/sdk-statement"

// statements with specific topics and specific decryptionkey.
const statements = await statementSdk.getStatements({
  topics: [stringToTopic("pop"), stringToTopic("chat"), stringToTopic("v1")],
  dest: Binary.fromHex(
    "0xf0673d30606ee26672707e4fd2bc8b58d3becb7aba2d5f60add64abb5fea4710",
  ),
})
```

## Submit Statements

### Create Statement Signer

In order to sign a Statement, we need to create a signer. This can be done with the helper `getStatementSigner`, taking:

- `publicKey`: Pubkey of the signer
- `type`: `ed25519`, `sr25519`, `ecdsa` signature type.
- `signFn`: `(payload: Uint8Array) => Uint8Array | Promise<Uint8Array>` Cryptographic signing function.

As one can notice, this is very similar to the [`PolkadotSigner`](/signers) interface. Check those docs to learn more!

```ts twoslash
import { getStatementSigner } from "@polkadot-api/sdk-statement"
import { ed25519 } from "@noble/curves/ed25519.js"

const SECRET_KEY = new Uint8Array() // get your key

const signer = getStatementSigner(
  ed25519.getPublicKey(SECRET_KEY),
  "ed25519",
  (i) => ed25519.sign(i, SECRET_KEY),
)
```

### Create Statement

In order to create a statement, it is as simple as creating an `UnsignedStatement` object.

```ts twoslash
import { Binary } from "polkadot-api"
import type { UnsignedStatement } from "@polkadot-api/sdk-statement"

const statement: UnsignedStatement = {
  data: Binary.fromHex("0xDEADBEEF"),
  priority: 1,
}
```

### Submit Statement

Once we have the signer and the statement, we can go to sign and submit it to the store!

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { createStatementSdk } from "@polkadot-api/sdk-statement"
const client = createClient(
  getWsProvider("wss://paseo-people-next-rpc.polkadot.io"),
)
const statementSdk = createStatementSdk(client._request)
import { getStatementSigner } from "@polkadot-api/sdk-statement"
import { ed25519 } from "@noble/curves/ed25519.js"
const SECRET_KEY = new Uint8Array()
import { Binary } from "polkadot-api"
import type { UnsignedStatement } from "@polkadot-api/sdk-statement"
// ---cut---
const signer = getStatementSigner(
  ed25519.getPublicKey(SECRET_KEY),
  "ed25519",
  (i) => ed25519.sign(i, SECRET_KEY),
)

const statement: UnsignedStatement = {
  data: Binary.fromHex("0xDEADBEEF"),
  priority: 1,
}

const signed = await signer.sign(statement)

await statementSdk.submit(signed)
```
