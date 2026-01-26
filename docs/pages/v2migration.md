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

Previously, compatibility APIs were integrated within the TypedAPI. To make it clearer that they are compared against a specific runtime.

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
