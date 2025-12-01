# Top-level client

`PolkadotClient` interface shapes the top-level API for `polkadot-api`. Once we get a client using `createClient` function, we'll find the following:

## Create a client

In order to create a client, you only need to have a [provider](/providers).
Optionally, you can pass `getMetadata` and `setMetadata` functions, useful for metadata caching. You can [find a recipe in the docs](/recipes/metadata-caching) on how to use this!

```ts twoslash
// [!include ~/snippets/startSm.ts]
import { getSmProvider } from "polkadot-api/sm-provider"
const provider = getSmProvider(smoldot.addChain({ chainSpec: "" }))
//---cut---
import { createClient } from "polkadot-api"

const client = createClient(provider)
```

## `PolkadotClient`

Let's dive into each part of the `PolkadotClient` interface.

### `getChainSpecData`

Type: `() => Promise<{name: string; genesisHash: string; properties: any}>{:ts}`

Retrieve the ChainSpecData directly as it comes from the [JSON-RPC spec](https://paritytech.github.io/json-rpc-interface-spec/api/chainSpec.html).

The consumer shouldn't make assumptions on this data, as it might change from session to session and it is not strictly typed.

### `getMetadata$`

Type: `(atBlock: HexString) => Observable<Uint8Array>{:ts}`

Retrieves the most modern version of the metadata for a given block. That is, if metadata versions 14, 15 and 16 are available, metadata version 16 will be returned.

The observable will emit once, and immediately complete.

### `getMetadata`

Type: `(atBlock: HexString, signal?: AbortSignal) => Promise<Uint8Array>{:ts}`

Retrieves the most modern version of the metadata for a given block. That is, if metadata versions 14, 15 and 16 are available, metadata version 16 will be returned.

The function accepts an abort signal to make the promise abortable.

### `finalizedBlock$`

Type: `Observable<BlockInfo>{:ts}`

This Observable emits [`BlockInfo`](/types#blockinfo) for every new finalized block. It is multicast and stateful. For a new subscription, it will synchronously repeat its latest known state.

### `getFinalizedBlock`

Type: `() => Promise<BlockInfo>{:ts}`

This function returns [`BlockInfo`](/types#blockinfo) for the latest known finalized block.

### `bestBlocks$`

Type: `Observable<BlockInfo[]>{:ts}`

This Observable emits an array of [`BlockInfo`](/types#blockinfo), being the first element the latest known best block, and the last element the latest known finalized block.

The following guarantees apply:

- It is a multicast and stateful observable. For a new subscription, it will synchronously repeat its latest known state.
- In every emission, the array will have length of at least `1{:ts}`.
- The emitted arrays are immutable data structures; i.e. a new array is emitted at every event but the reference to its children are stable if the children didn't change.

### `getBestBlocks`

Type: `() => Promise<BlockInfo[]>{:ts}`

This function returns the latest known state of [`bestBlocks$`](/client#bestblocks). It holds the same guarantees.

### `blocks$`

Type: `Observable<BlockInfo>{:ts}`

This observable emits [`BlockInfo`](/types#blockinfo) for every block the client discovers. This observable follows the following rules:

- Right after subscription, the observable will emit synchronously the latest finalized block and all its known descendants.
- The emissions are "continuous"; i.e. for every block emitted it is guaranteed that the parent of it has already been emitted.
- The Observable will complete if the continuity of the blocks cannot be guaranteed.

### `hodlBlock`

Type: `(blockHash: HexString) => () => void{:ts}`

This function prevents the block from being unpinned. Returns a function that releases the hold, allowing the block to be unpinned once no other operations remain.

```ts twoslash
import type { PolkadotClient } from "polkadot-api"
const client: PolkadotClient = null as any
// ---cut---
const finalized = await client.getFinalizedBlock()
const releaseFn = client.hodlBlock(finalized.hash)

// the block will not be released!
setTimeout(async () => {
  const body = await client.getBlockBody(finalized.hash)
  releaseFn()
}, 100_000)
```

### `watchBlockBody`

Type: `(hash: string) => Observable<HexString[]>{:ts}`

Retrieves the body of the block given; which can be a block hash, `"finalized"{:ts}` or `"best"{:ts}`.

The observable will emit once, and immediately complete.

### `getBlockBody`

Type: `(hash: string) => Promise<HexString[]>{:ts}`

Retrieves the body of the block given; which can be a block hash, `"finalized"{:ts}` or `"best"{:ts}`.

### `getBlockHeader`

Type: `(hash?: string) => Promise<BlockHeader>{:ts}`

Retrieves the decoded header of the block given; which can be a block hash, `"finalized"{:ts}` (default) or `"best"{:ts}`.

### `submit`

Type: `(transaction: HexString, at?: HexString) => Promise<TxFinalizedPayload>{:ts}`

Broadcasts a transaction. The promise will resolve when the transaction is found in a finalized block, and will reject if the transaction is deemed invalid (either before or after broadcasting).

This function follows the same logic as the [transaction API `submitAndWatch` function](/typed/tx#signandsubmit), find more information about it there.

### `submitAndWatch`

Type: `(transaction: HexString, at?: HexString) => Observable<TxBroadcastEvent>{:ts}`

Broadcasts a transaction. This function follows the same logic as the [transaction API `signSubmitAndWatch` function](/typed/tx#signsubmitandwatch), find more information about the emitted events there.

### `getTypedApi`

Type: `(descriptors: ChainDefinition) => TypedApi{:ts}`

The Typed API is the entry point to the runtime-specific interactions with Polkadot-API. You can do storage queries, create transactions, run view functions, etc!

[`TypedApi` has its own documentation](/typed). Check it out!

### `getUnsafeApi`

Type: `() => UnsafeApi{:ts}`

The Unsafe API is another way to access the specific interactions of the chain you're connected to. Nevertheless, it has its own caveats, read the docs before using it!

[`UnsafeApi` has its own documentation](/unsafe). Check it out!

### `rawQuery`

Type:

```ts
rawQuery: (
  storageKey: HexString | string,
  options?: { at: string; signal: AbortSignal },
) => Promise<HexString | null>
```

This function allows to access the raw storage value of a given key. It'll return the encoded value, or `null{:ts}` if the value is not found.

Parameters:

- `storageKey`: it can be both an encoded key (as `HexString`) or a well-known Substrate key (such as `":code"{:ts}`).
- `options`: Optionally pass `at` (block hash, `"finalized"{:ts}` (default), or `"best"{:ts}`) and/or `signal`, to make the promise abortable.

### `destroy`

Type: `() => void{:ts}`

This function will unfollow the provider, error every subscription pending and disconnect from the provider. After calling it, nothing else can be done with the client.

### `_request`

Type: `(method: string, params: Array<any>) => Promise<any>{:ts}`

This function allows to call any RPC endpoint through the JSON-RPC provider. This method is not typed by itself, but you can add your own types. It is meant as an escape-hatch for chain-specific nodes, you should use all the other APIs for regular interactions.

For example, with `system_version`:

```ts twoslash
import type { PolkadotClient } from "polkadot-api"
const client: PolkadotClient = null as any
// ---cut---
const nodeVersion = await client._request<string, []>("system_version", [])
//    ^?
```
