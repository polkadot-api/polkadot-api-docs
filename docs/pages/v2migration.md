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

#### Config option changes

**innerEnhancer**

This configuration option has been removed.

If you were using it for logging, the new property `logger` provides all events happening on the underlying websocket: connections, disconnections, errors and also in and out messages.

If you were using it for more advanced use cases, it also accepts a `websocketClass` to customize the WebSocket class used by the provider.

**Status change events:**

The `WsEvent` enum is still available and exported from `polkadot-api/ws`. The only change is that the enum values (`CONNECTING`, `CONNECTED`, `CLOSE`, `ERROR`) now resolve to their string equivalents instead of numbers. If you were using `WsEvent.CONNECTING`, etc. then it should continue to work without changes.

### Smoldot Provider

When a smoldot chain is destroyed it can't be reused. In v1 there were some edge cases where a smoldot provider would stop working because it required a new smoldot chain to be instantiated.

For this reason, in v2 now `getSmProvider` takes a factory function instead. It's important to note that you should create the smoldot chain inside that function, as re-using the same chain could end up with the same issue.

##### v1

```ts
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"
import { chainSpec } from "polkadot-api/chains/westend"

const smoldot = start()

const westendChain = smoldot.addChain({ chainSpec })
const client = createClient(getSmProvider(westendChain))
```

##### v2

```ts
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { start } from "polkadot-api/smoldot"
import { chainSpec } from "polkadot-api/chains/westend"

const smoldot = start()

const client = createClient(
  getSmProvider(() => smoldot.addChain({ chainSpec })),
)
```

### JsonRpcProvider

The `JsonRpcProvider` interface has changed: instead of using stringified messages, it has them parsed, for both input and output.

All of the providers and enhancers provided by polkadot-api have been migrated, so it shouldn't require any change. If you were using custom enhancers, then you can omit parsing/stringifying.

#### Custom Enhancers and Providers

If you have custom providers or enhancers, you need to update them to work with parsed messages:

##### v1

```ts
import type { JsonRpcProvider } from "polkadot-api/ws-provider"

const myEnhancer =
  (parent: JsonRpcProvider): JsonRpcProvider =>
  (onMessage) => {
    const inner = parent((msg) => {
      const parsed = JSON.parse(msg) // ❌ Messages were strings
      // ... process parsed
      onMessage(JSON.stringify(parsed)) // ❌ Send stringified
    })

    return {
      send(message) {
        inner.send(message) // ❌ Message was a string
      },
      disconnect() {
        inner.disconnect()
      },
    }
  }
```

##### v2

```ts
import type { JsonRpcProvider } from "polkadot-api" // ✅ Import from main package

const myEnhancer =
  (parent: JsonRpcProvider): JsonRpcProvider =>
  (onMessage) => {
    const inner = parent((msg) => {
      // ✅ msg is already parsed - no JSON.parse needed
      // ... process msg directly
      onMessage(msg) // ✅ Send parsed object directly
    })

    return {
      send(message) {
        inner.send(message) // ✅ message is parsed object
      },
      disconnect() {
        inner.disconnect()
      },
    }
  }
```

**Key differences:**

- Import `JsonRpcProvider` from `"polkadot-api"` (not `"polkadot-api/ws"`)
- Remove all `JSON.parse()` calls - messages are already parsed
- Remove all `JSON.stringify()` calls - send parsed objects
- If interfacing with workers or external systems that use strings, parse/stringify at the boundary

## Binary

The `Binary` class has been removed. Now PAPI works with `Uint8Array`s, the native primitive for binary data.

Instead, `Binary` is a set of utilities to easily convert various formats (hex, text, opaque) with `Uint8Array`.

##### v1

```ts
import { Binary } from "polkadot-api"

const myBytes = Binary.fromText("I'm migrating to PAPI v2!")
console.log("bytes", myBytes.asBytes())
console.log("hex", myBytes.asHex())
console.log("text", myBytes.asText())
```

##### v2

```ts
import { Binary } from "polkadot-api"

const myBytes = Binary.fromText("I'm migrating to PAPI v2!")
console.log("bytes", myBytes)
console.log("hex", Binary.toHex(myBytes))
console.log("text", Binary.toText(myBytes))
```

**Important notes:**

- The pattern changed from `instance.asMethod()` to `Binary.toMethod(instance)`
- `Uint8Array` is used directly - no wrapping needed
- `Binary.fromBytes()` **does not exist** in v2 - just use the `Uint8Array` directly:

  ```ts
  // v1
  Binary.fromBytes(myUint8Array).asHex()

  // v2
  Binary.toHex(myUint8Array) // Pass Uint8Array directly
  ```

## FixedSizeBinary

Fixed-size binaries are usually more convenient to be expressed as Hex, as they often represent hashes or addresses. For this reason, they are not `Uint8Array`s, but just hex strings typed as `SizedHex<number>`. The generic in `SizedHex` is only to show information about the expected length for that parameter.

##### v1

```ts
import { FixedSizeBinary } from "polkadot-api"

const myHash = FixedSizeBinary.fromHex("0x1234567890")
console.log("bytes", myHash.asBytes())
console.log("hex", myHash.asHex())
```

##### v2

```ts
import { Binary, SizedHex } from "polkadot-api"

const myHash: SizedHex<5> = "0x1234567890"
console.log("bytes", Binary.fromHex(myHash))
console.log("hex", myHash)
```

## Transaction parameters

Transaction parameters have changed from an object/struct to arguments, matching the call signature of the transaction. This makes transaction APIs more consistent with Runtime APIs.

##### v1

```ts
const api = client.getTypedApi(wnd)

// create the transaction sending Bob some assets
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const transfer = api.tx.Balances.transfer_allow_death({
  dest: MultiAddress.Id(BOB),
  value: 12345n,
})
```

##### v2

```ts
const api = client.getTypedApi(wnd)

// create the transaction sending Bob some assets
const BOB = "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty"
const transfer = api.tx.Balances.transfer_allow_death(
  MultiAddress.Id(BOB),
  12345n,
)
```

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
  staticApis.compat.apis.StakingApi.nominations_quota.isCompatible()
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

The `watchValue` method of storage queries now returns an observable with an object containing both the value and the block information: `{ value: T, block: BlockInfo }`.

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

## Events

### Pulling events

The events API has been reworked. Instead of `pull(): Promise<Event[]>`, which returned the list of events in the latest finalized, v2 has `get(blockHash: HexString): Promise<Event[]>`, which is more explicit over which block you want to get the events from.

Additionally, some return values were inconsistent: Some methods returned the inner value of the event, others returned an object with `{ meta: { block, phase }, payload: T }`, others included the topics, etc. This has changed so that every method returns the same interface: `{ original: SystemEvent, payload: T }`. The original event keeps the same structure from SystemEvents, which include topics and phase.

##### v1

```ts
const typedApi = client.getTypedApi(dot)

const events = await typedApi.event.Balances.Transfer.pull()
events.forEach((evt) => {
  console.log(evt.meta.block, evt.meta.phase, evt.payload)
})
```

##### v2

```ts
const typedApi = client.getTypedApi(dot)

const finalizedBlock = await client.getFinalizedBlock()
const events = await typedApi.event.Balances.Transfer.get(finalizedBlock.hash)
events.forEach((evt) => {
  console.log(
    finalizedBlock.hash,
    evt.original.phase,
    evt.original.topics,
    evt.payload,
  )
})
```

### Watching events

`watch(filter): Observable<{ meta, payload }>` has also changed significantly. The filter parameter is removed, as it can easily be achieved by composing observables with the `filter` operator.

The observable used to return the events flattened out. This has changed so that it performs one single emission per block, with the hash that it was found `{ block: BlockInfo, events: Array<{ original: SystemEvent, payload: T }>}`.

##### v1

```ts
const typedApi = client.getTypedApi(dot)

typedApi.event.Balances.Transfer.watch((evt) => evt.from === ALICE).subscribe(
  (evt) => {
    console.log(evt.meta.block, evt.meta.phase, evt.payload)
  },
)
```

##### v2

```ts
const typedApi = client.getTypedApi(dot)

// This is more versatile, but this will be a copy-paste of the original behavior (except for the event object shape)
typedApi.event.Balances.Transfer.watch()
  .pipe(
    mergeMap(({ block, events }) =>
      events
        .filter((evt) => evt.from === ALICE)
        .map((evt) => ({ ...evt, block })),
    ),
  )
  .subscribe((evt) => {
    console.log(evt.block, evt.original.phase, evt.original.topics, evt.payload)
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

## Troubleshooting

### TypeScript Errors

**Error: `Property 'isCompatible' does not exist`**

You need to use `getStaticApis()`:

```ts
// Before
await api.apis.SomeApi.someCall.isCompatible()

// After
const staticApis = await api.getStaticApis()
await staticApis.compat.apis.SomeApi.someCall.isCompatible()
```

**Error: `'JsonRpcProvider' is not exported by "polkadot-api/ws"`**

For custom providers/enhancers, import from the main package:

```ts
// Wrong
import type { JsonRpcProvider } from "polkadot-api/ws"

// Correct
import type { JsonRpcProvider } from "polkadot-api"
```

**Error: `Property 'fromBytes' does not exist on type 'Binary'`**

`Binary.fromBytes()` doesn't exist in v2. Pass `Uint8Array` directly:

```ts
// Before
Binary.fromBytes(myUint8Array).asHex()

// After
Binary.toHex(myUint8Array)
```

**Error: `Argument of type 'Promise<Chain>' is not assignable to parameter`**

`getSmProvider` now expects a function:

```ts
// Before
getSmProvider(Promise.all([...]))

// After
getSmProvider(() => Promise.all([...]))
```
