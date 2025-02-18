# Storage queries

For `query` we have mainly two different situations. There're two kinds of storage entries: entries with and without keys.

## Entries without keys

For example, `System.Number` query (it returns the block number) has no keys to index it with. Therefore, under `typedApi.System.Number` we have the following structure:

```ts
type CallOptions = Partial<{
  at: string
  signal: AbortSignal
}>

type StorageEntryWithoutKeys<Payload> = {
  isCompatible: IsCompatible
  getCompatibilityLevel: GetCompatibilityLevel
  getValue: (options?: CallOptions) => Promise<Payload>
  watchValue: (bestOrFinalized?: "best" | "finalized") => Observable<Payload>
}
```

As you might expect, `getValue` returns you the `Payload` for that particular query, allowing you to choose which block to query (`at` can be a blockHash, `"finalized"` (the default), or `"best"`).

On the other hand, `watchValue` function returns an Observable allows you to check the changes of a particular storage entry in `"best"` or `"finalized"` (the default) block.

## Entries with keys

Similarly, we'll use the example of `System.Account` query (it returns the information of a particular `Account`). In this case, this storage query has a key to index it with, and therefore we find the following structure:

```ts
type StorageEntryWithKeys<Args, Payload, ArgsOut> = {
  isCompatible: IsCompatible
  getCompatibilityLevel: GetCompatibilityLevel
  getValue: (...args: [...Args, options?: CallOptions]) => Promise<Payload>
  watchValue: (
    ...args: [...Args, bestOrFinalized?: "best" | "finalized"]
  ) => Observable<Payload>
  getValues: (
    keys: Array<[...Args]>,
    options?: CallOptions,
  ) => Promise<Array<Payload>>
  getEntries: (
    ...args: [PossibleParents<Args>, options?: CallOptions]
  ) => Promise<
    Array<{
      keyArgs: ArgsOut
      value: NonNullable<Payload>
    }>
  >
  watchEntries: (
    ...args: [PossibleParents<Args>, options?: { at: "best" }]
  ) => Observable<{
    block: BlockInfo
    deltas: null | {
      deleted: Array<{ args: ArgsOut; value: NonNullable<Payload> }>
      upserted: Array<{ args: ArgsOut; value: NonNullable<Payload> }>
    }
    entries: Array<{ args: ArgsOut; value: NonNullable<Payload> }>
  }>
}
```

Both `getValue` and `watchValue` have the same behaviour as in the previous case, but they require you to pass all keys required for that storage query (in our example, an address). The same function arguments that are found in the no-keys situation can be passed at the end of the call to modify which block to query, etc. For example, a query with 3 args:

```ts
typedApi.query.Pallet.Query.getValue(arg1, arg2, arg3, { at: "best" })
```

`getValues`, instead, allows you to pass several keys (addresses in this case) to get a bunch of entries at the same time.

`getEntries` allows you to get all entries without passing the keys. It has also the option to pass a subset of them. For example, imagine a query with 3 keys. You would have three options to call it:

```ts
typedApi.query.Pallet.Query.getEntries({ at: "best" }) // no keys
typedApi.query.Pallet.Query.getEntries(arg1, { at: "finalized" }) // 1/3 keys
typedApi.query.Pallet.Query.getEntries(arg1, arg2, { at: "0x12345678" }) // 2/3 keys
```

:::note
`getEntries` returns as well the key arguments for every entry found. There are some storage entries whose arguments cannot be inferred directly from the key, because the arguments are hashed to compute the key. Therefore, only in these cases, `keyArgs` will be the `key` instead of the arguments themselves. The type will be `OpaqueKeyHash`.
:::

`watchEntries` allows you to watch changes to all entries of a storage map. As in `getEntries`, you can optionally provide a subset of the keys and/or `{at: "best"}` to watch changes to the best block, instead of the default `"finalized"` block. Events will be emitted disregarding if there were (or not) changes to the entries. There is no guarantee that an event will be emitted for every block. The events will contain:

- `block`: Block hash, block number, and parent block hash; to identify how updated the information is.
- `deltas`: In case there were any changes since previous event, `upserted` (meaning added or changed) and `deleted` entries. If `deltas` were to be `null`, then no changes happened since the last emission.
- `entries`: Immutable data-structure with the whole bunch of entries, updated to that block.
