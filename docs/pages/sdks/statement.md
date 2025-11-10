# Statement SDK

The statement SDK is a lower level library for interacting with a nodes RPC calls related to the [Statement-Store](https://github.com/paritytech/polkadot-sdk/tree/master/substrate/primitives/statement-store) primitive.

## Getting Started

Install the sdk through your package manager:

```sh
pnpm i @polkadot-api/sdk-statement
```

Here is an example of using the Statement-SDK with a `PolkadotClient`. The SDK, however, is built agnostic to the PAPI and does just require function to interact with a nodes JSON RPC interface.

```ts
import { createStatementSdk } from "@polkadot-api/sdk-statement"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://paseo-people-next-rpc.polkadot.io")
const client = createClient(provider)
const statementSdk = createStatementSdk(client._request)
```

## Fetching Statements

The actual Statement Store API is currently still under development. As of now there are only 3 ways to query the data.

If your used node allows it, you can just `dump()` all statements available for this node.

Another option is to query statements `getStatements` based on given `topics` and destination, `dest`.

```ts
// all currently available statements of that node.
const statements = await statementSdk.dump()

// get statements by topic
const topic1 = FixedSizeBinary.fromHex(
  "0xDEADBEEF0000000000000000000000000000000000000000000000000000000000",
)
const destinationPublicKey = FixedSizeBinary.fromHex(
  "0xDEAFBEEF0000000000000000000000000000000000000000000000000000000000",
)

const encryptedStatements = await sdkStatementApi.getStatements({
  topics: [topic1],
  dest: destinationPublicKey, // only encrypted statements for this public key
})

const unencryptedStatements = await sdkStatementApi.getStatements({
  topics: [topic1],
  dest: null, // indicates to only return unencrypted statements
})

const encryptedAndUnencryptedStatements = await sdkStatementApi.getStatements({
  topics: [topic1],
  dest: undefined, // returned statements can be encrypted or unencrypted
})
```

## Creating and Submitting a Statement

Creating a Statement is as simple as defining a `UnsignedStatement` object. However, for it to be accepted by the chain you normally have to sign it as well. For this you should create a `StatementSigner`. This signer needs to be able to sign raw bytes. You can define on by using the `getStatementSigner()` function.

Following is a complete example showing you how to define, sign and submit a `Statement`.

```ts
import {
  UnsignedStatement,
  getStatementSigner,
} from "@polkadot-api/sdk-statement"
import * as sr25519 from "@scure/sr25519"

const unsignedStatement: UnsignedStatement = {
  priority: 1,
  channel: FixedSizeBinary.fromHex(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ),
  topics: [
    FixedSizeBinary.fromHex(
      "0xDEADBEEF0000000000000000000000000000000000000000000000000000000000",
    ),
  ],
  data: Binary.fromHex("0xCAFE"),
}

const seed = new Uint8Array()
const secretKey = sr25519.secretFromSeed(seed)
const publicKey = sr25519.getPublicKey(secretKey)

const statementSigner = getStatementSigner(publicKey, "sr25519", (payload) => {
  return sr25519.sign(secretKey, payload)
})
const signedStatement = statementSigner.sign()

await sdkStatementApi.submit(signedStatement)
```
