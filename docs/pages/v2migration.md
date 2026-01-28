# Migrate to V2

PAPI v2 brings a few changes that make development easier, with a more consistent interface throughout the API.

Here's a migration guide to help you switch from version 1 to version 2

## JSON-RPC providers

### WebSocket Provider

#### getWsProvider

The WsProvider utilities have been moved to `polkadot-api/ws`. As the latest LTS of NodeJS supports the latest WebSocket spec, the `node` and `web` sub-paths have been removed.

The `getWsProvider` provider now automatically uses the appropriate methods based on the capabilities of the node. Therefore, the `withPolkadotSdkCompat` function from `polkadot-sdk-compat` has been removed, and can be safely omitted.

##### v1

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider" // [!code hl]
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://rpc.ibp.network/polkadot")), // [!code hl]
)
```

##### v2

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws" // [!code hl]

const client = createClient(
  getWsProvider("wss://rpc.ibp.network/polkadot"), // [!code hl]
)
```

#### createWsClient

Additionally, there's now a convenience function `createWsClient` that creates a PAPI client directly from a WsURL

##### v1

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const client = createClient(getWsProvider("wss://rpc.ibp.network/polkadot"))
```

##### v2

```ts
import { createWsClient } from "polkadot-api/ws"

const client = createWsClient("wss://rpc.ibp.network/polkadot")
```

### JsonRpcProvider

The `JsonRpcProvider` interface has changed: instead of using stringified messages, it has them parsed, for both input and output.

All of the providers and enhancers provided by polkadot-api have been migrated, so it shouldn't require any change. If you were using custom enhancers, then you can omit parsing/stringifying, or add a `JSON.stringify` if you are expecting strings.

## Compatibility API & RuntimeToken

The compatibility API has changed significantly. The runtime and compatibility token has been removed, and the function to check the compatibility is now in a separate `typedApi.getStaticApis()`

`typedApi.getStaticApis()` returns a promise of a set of APIs that target one specific runtime. Once the runtime is loaded, the promise resolves and you have access to a few APIs that can run synchronously. You can optionally pass in the block you want to use for that, but it defaults to `finalized`.

Once that block runtime is loaded, then you have synchronous access to anything that's inside: `decodeCallData(callData)` to decode a call data, `constants` to access the constants, `tx` to get call data, and `compat` to check compatibility across all APIs.

### Compatibility

Previously, compatibility APIs were integrated within the TypedAPI. This has been moved in v2 to `getStaticApis`, to make it clearer that they are compared against a specific runtime.

The new API allows to have better control on runtime upgrades, but could require a bit of refactoring. If you want a quick 1-to-1 update on inline compatibility checks, it's more simple:

##### v1

```ts
const typedApi = client.getTypedApi(dot)

const isCompatible =
  await typedApi.apis.StakingApi.nominations_quota.isCompatible()
if (isCompatible) {
  typedApi.apis.StakingApi.nominations_quota(123n)
}
```

##### v2

```ts
const typedApi = client.getTypedApi(dot)
const staticApis = await typedApi.getStaticApis()

const isCompatible =
  await staticApis.compat.apis.StakingApi.nominations_quota.isCompatible()
if (isCompatible) {
  typedApi.apis.StakingApi.nominations_quota(123n)
}
```

### RuntimeToken

V1 had an API to be able to make some async operations become synchronous, with what was called the `CompatibilityToken` for the TypedAPI, or the `RuntimeToken` for the unsafe API. You would get this token and then you could pass it along constant calls, compatibility calls, etc. and you'd get the result synchronously.

This token has been removed. This can be achieved now with `getStaticApis()`, which conveys that they are against one specific block.

##### v1

```ts
const typedApi = client.getTypedApi(dot)
const token = await typedApi.compatibilityToken

const version = typedApi.constants.System.Version(compatibilityToken)
```

##### v2

```ts
const typedApi = client.getTypedApi(dot)
const staticApis = await typedApi.getStaticApis()

const version = staticApis.constants.System.Version
```

This also allows you to fetch the constant for one specific block (as opposed to v1 where you could only get it for the finalized block)

Another place the token was used for a synchronous version was when encoding or decoding a transaction call data. In this case, it's also inside staticApis:

##### v1

```ts
const typedApi = client.getTypedApi(dot)
const token = await typedApi.compatibilityToken

const callData = typedApi.tx.System.remark({
  data: Binary.fromText("Hello!"),
}).getEncodedData(token)

// Reverse it
const tx = typedApi.txFromCallData(callData, token)
```

##### v2

```ts
const typedApi = client.getTypedApi(dot)
const staticApis = await typedApi.getStaticApis()

const callData = staticApis.tx.System.remark(
  Binary.fromText("Hello!"),
).getCallData()

// Reverse it
const { pallet, name, input } = staticApis.decodeCallData(callData)
```

## WatchValue

The `watchValue` method of storage queries now returns on observable with an object with the value and the block that it was last found.

Also, the API changes to be more consistent with other methods: The second optional argument now takes the `at: HexString | 'finalized' | 'best'` as a property of an object.

##### v1

```ts
const typedApi = client.getTypedApi(dot)
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

typedApi.query.System.Account.watchValue(ALICE, "best").subscribe(
  (accountValue) => {
    console.log("value", accountValue)
  },
)
```

##### v2

```ts
const typedApi = client.getTypedApi(dot)
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

typedApi.query.System.Account.watchValue(ALICE, { at: "best" }).subscribe(
  (update) => {
    console.log("block", update.block)
    console.log("value", update.value)
  },
)

// If you want the exact behaviour as before
import { distinctUntilChanged, map } from "rxjs"
typedApi.query.System.Account.watchValue(ALICE, { at: "best" })
  .pipe(
    map((v) => v.value),
    // The reference of `value` will be kept if it didn't change
    distinctUntilChanged(),
  )
  .subscribe((accountValue) => {
    console.log("value", accountValue)
  })
```

## Utility function and overload changes

### Transaction at

The `at: BlockHash` parameter when creating a transaction now only accepts a specific block hash.

It's important to understand that this parameter only affects the mortality of the transaction: It will only be valid on that specific block or its children, up to the configured mortality period. For this reason, using `at: 'best'` was often problematic since the tx wouldn't be included after a re-org.

If omitted, it will be the finalized block. If you were passing `best` and you are aware of the consequences of re-orgs, then get a blockHash from `client.getBestBlocks()` and pass it to the `at` parameter.

### `watchBlockBody`

`client.watchBlockBody` has been renamed to `client.getBlockBody$`

### `jsonPrint`

The `jsonPrint` function has been removed. Instead, the `polkadot-api/utils` package now exports a `jsonSerialize` and `jsonDeserialize` replacer functions to be used with the browser's `JSON.stringify` and `JSON.parse` functions.

This is a bit more flexible since it can be now composed with other JSON replacer functions, as well as allows for a 1-line JSON string.

##### v1

```ts
import { jsonPrint } from "polkadot-api/utils"

// ...

console.log(jsonPrint(systemAccount))
```

##### v2

```ts
import { jsonSerialize } from "polkadot-api/utils"

// ...

console.log(JSON.stringify(systemAccount, jsonSerialize))
```

### `mergeUint8(...args)`

`mergeUint8` utility function now only accepts one argument which must be an array. To migrate, simply wrap the arguments with an array.

### `getBlockBody` and `getBlockHeader`

`getBlockBody` and `getBlockHeader` took an optional argument `hash?: HexString`, which defaulted to the finalized block.

However, it doesn't make sense to get a random body or header, so now it requires passing in a specific block.

If you need that, get the hash from `client.getBestBlocks()` or `client.getFinalizedBlock()`

## Chain renames

Chain names have changed to become easier to use:

- Westend: All `westend2` prefix have changed to `westend`: `westend`, `westend_asset_hub`, etc.
- Kusama: All `ksmcc3` prefix have changed to `kusama`: `kusama`, `kusama_asset_hub`, etc.
- Rococo: Rococo has been dropped, as it was sunset.

The CLI will auto-migrate the config for existing projects with this change, but it will only accept the new chain names for newly added chains.
