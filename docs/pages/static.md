# Static APIs

The `StaticApis` object provides **synchronous** access to runtime-specific operations that would otherwise be asynchronous. It targets a specific runtime version (identified by the block's code hash), making it ideal for scenarios where you need multiple synchronous operations without repeated async calls.

## Getting StaticApis

You obtain a `StaticApis` instance by calling `getStaticApis()` on a `TypedApi`:

```ts
const typedApi = client.getTypedApi(dot)

// Get StaticApis for the finalized block (default)
const staticApis = await typedApi.getStaticApis()

// Or target a specific block
const staticApis = await typedApi.getStaticApis({ at: "best" })
const staticApis = await typedApi.getStaticApis({ at: "0x1234..." }) // block hash
```

The promise resolves once the runtime metadata for that block is loaded. After that, all operations on `staticApis` are synchronous.

## Interface

```ts
type StaticApis = {
  id: string
  constants: ConstantsApi
  tx: TxApi
  query: QueryApi
  txFromCallData: (callData: Uint8Array) => Transaction
  compat: CompatApi
}
```

## `id`

A unique identifier for the runtime. This can be useful for caching or comparing runtime versions.

```ts
const staticApis = await typedApi.getStaticApis()
console.log("Runtime ID:", staticApis.id)
```

## `constants`

Access runtime constants synchronously. Unlike `typedApi.constants.Pallet.Constant()` which returns a `Promise`, static APIs return the value directly:

```ts
// Async version (TypedApi)
const version = await typedApi.constants.System.Version()

// Sync version (StaticApis)
const staticApis = await typedApi.getStaticApis()
const version = staticApis.constants.System.Version
```

This is particularly useful when you need to read multiple constants without awaiting each one:

```ts
const staticApis = await typedApi.getStaticApis()

// All synchronous!
const version = staticApis.constants.System.Version
const ss58Prefix = staticApis.constants.System.SS58Prefix
const existentialDeposit = staticApis.constants.Balances.ExistentialDeposit
```

## `tx`

Build transaction call data synchronously. This is useful when you need to encode transactions without signing them.

```ts
const staticApis = await typedApi.getStaticApis()

// Get the call data for a transaction
const callData: Uint8Array = staticApis.tx.Balances.transfer_keep_alive({
  dest: MultiAddress.Id("5GrwvaEF..."),
  value: 10n ** 10n,
}).getCallData()
```

The `tx` API mirrors the structure of `typedApi.tx`, but instead of returning a full `Transaction` object, it returns an object with a `getCallData()` method that synchronously produces the encoded call data.

## `query`

Access storage key encoding synchronously. This is useful when you need to compute storage keys without making RPC calls.

```ts
const staticApis = await typedApi.getStaticApis()

// Get the storage key for an account
const storageKey = staticApis.query.System.Account.getKey(
  "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
)
```

## `txFromCallData`

Decode raw call data back into a `Transaction` object synchronously:

```ts
const staticApis = await typedApi.getStaticApis()

// Encode a call
const callData = staticApis.tx.System.remark({
  remark: Binary.fromText("Hello!"),
}).getCallData()

// Decode it back
const tx = staticApis.txFromCallData(callData)
console.log(tx.decodedCall)
// { type: "System", value: { type: "remark", value: { remark: Uint8Array } } }
```

This is the synchronous equivalent of `typedApi.txFromCallData()`. It's useful when working with call data from external sources (like multisig proposals or governance referenda).

## `compat`

Check compatibility of runtime interactions. After generating the descriptors (see [Codegen](/codegen) section), you have a typed interface to every interaction with the chain. However, breaking runtime upgrades might happen between development and the runtime execution of your app. The `compat` API enables you to check at runtime if there was a breaking upgrade that affected your particular method, giving you the opportunity to adapt and use the newly compatible interactions instead.

The `compat` object has the same structure as the TypedApi:

- `compat.tx.Pallet.Call`
- `compat.query.Pallet.Entry`
- `compat.constants.Pallet.Constant`
- `compat.apis.ApiName.method`
- `compat.event.Pallet.Event`

Each entry exposes:

- `isCompatible(level?: CompatibilityLevel): boolean`
- `getCompatibilityLevel(): CompatibilityLevel`

### `CompatibilityLevel`

The enum `CompatibilityLevel` defines 4 levels of compatibility:

```ts
enum CompatibilityLevel {
  // No possible value from origin will be compatible with dest
  Incompatible,
  // Some values of origin will be compatible with dest
  Partial,
  // Every value from origin will be compatible with dest
  BackwardsCompatible,
  // Types are identical
  Identical,
}
```

#### `Incompatible`

The operation is not compatible with the current runtime. It might be that the interaction was removed completely, or a smaller change such as having a property removed from a storage query.

#### `Partial`

Some values will be compatible depending on the actual values being sent or received. For instance, `getCompatibilityLevel` for the transaction `Utility.batch_all` might return `CompatibilityLevel.Partial` if one of the transactions it takes as input was removed. In this case, the call will be compatible as long as you don't send the removed transaction as one of its inputs.

Another instance of partial compatibility is when an optional property on an input struct was made mandatory. If your dApp was always populating that field, it will still work properly, but if you had cases where you weren't setting it, then it will be incompatible.

#### `BackwardsCompatible`

The operation had some changes, but they are backwards compatible with the descriptors generated at dev time. In the case of `Utility.batch_all`, this might happen when a new transaction is added as a possible input. There was a change, and PAPI lets you know about it with this level, but you can be sure that any transaction you pass as an input will still work.

A backwards-compatible change also happens in structs. For instance, if an input struct removes one of its properties, those operations are still compatible.

#### `Identical`

Types are identical between the descriptors and the current runtime. No changes were made.

### `getCompatibilityLevel`

Returns the compatibility level for the interaction:

```ts
const staticApis = await typedApi.getStaticApis()

const level = staticApis.compat.query.System.Account.getCompatibilityLevel()

switch (level) {
  case CompatibilityLevel.Identical:
    console.log("Types are identical")
    break
  case CompatibilityLevel.BackwardsCompatible:
    console.log("Compatible with changes")
    break
  case CompatibilityLevel.Partial:
    console.log("Partially compatible - check your values")
    break
  case CompatibilityLevel.Incompatible:
    console.log("Not compatible!")
    break
}
```

### `isCompatible`

A utility to directly check for compatibility. The `threshold` parameter sets the minimum level required for the result to be `true` (inclusive). Passing `CompatibilityLevel.BackwardsCompatible` will return `true` for both identical and backwards compatible, but not for partial compatibility.

```ts
interface IsCompatible {
  (threshold?: CompatibilityLevel): boolean
}

// Equivalent to:
function isCompatible(threshold = CompatibilityLevel.Partial) {
  return getCompatibilityLevel() >= threshold
}
```

When called without arguments, `isCompatible()` defaults to `CompatibilityLevel.Partial`, meaning it returns `true` for partial, backwards compatible, and identical.

### Example

```ts
import { CompatibilityLevel } from "polkadot-api"

const staticApis = await typedApi.getStaticApis()

// Check if a transaction is at least partially compatible (default)
if (staticApis.compat.tx.Balances.transfer_keep_alive.isCompatible()) {
  // Safe to use - at least partial compatibility
}

// Require backwards compatibility or better
if (
  staticApis.compat.tx.Balances.transfer_keep_alive.isCompatible(
    CompatibilityLevel.BackwardsCompatible,
  )
) {
  // Safe to use - fully backwards compatible
}

// Check runtime APIs before using them
if (
  staticApis.compat.apis.StakingApi.nominations_quota.isCompatible(
    CompatibilityLevel.Partial,
  )
) {
  const quota = await typedApi.apis.StakingApi.nominations_quota(123n)
}

// Get the exact level for more nuanced handling
const level = staticApis.compat.query.System.Account.getCompatibilityLevel()

if (level === CompatibilityLevel.Partial) {
  console.warn("Query has partial compatibility - verify your usage")
}
```

The compatibility check is synchronous because `getStaticApis()` already waits for both the runtime metadata and the descriptors to be loaded. This makes it efficient to check multiple interactions without repeated async calls.

See [this recipe](/recipes/upgrade) for an example of handling runtime upgrades
