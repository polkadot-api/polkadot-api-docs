# API Reference

Complete reference for all `PolkadotClient` methods and properties.

## Client Creation

### `createClient(provider, options?)`

Creates a new PolkadotClient instance.

**Signature:**

```ts
function createClient(
  provider: JsonRpcProvider,
  options?: CreateClientOptions,
): PolkadotClient

interface CreateClientOptions {
  getMetadata?: (codeHash: HexString) => Promise<Uint8Array | null>
  setMetadata?: (codeHash: HexString, metadata: Uint8Array) => void
}
```

**Parameters:**

- `provider` - A JSON-RPC provider implementing the [JSON-RPC spec](https://paritytech.github.io/json-rpc-interface-spec/)
- `options` - Optional configuration:
  - `getMetadata` - Custom metadata cache getter
  - `setMetadata` - Custom metadata cache setter

**Returns:** `PolkadotClient`

**Example:**

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)
```

**See also:** [Creating Clients](/client/creating-clients)

---

## Chain Information

### `getChainSpecData()`

Retrieves the chain specification data including genesis hash, chain name, and properties.

**Signature:**

```ts
getChainSpecData(): Promise<ChainSpecData>

interface ChainSpecData {
  name: string
  genesisHash: string
  properties: {
    ss58Format?: number
    tokenDecimals?: number[]
    tokenSymbol?: string[]
    [key: string]: any
  }
}
```

**Returns:** `Promise<ChainSpecData>` - Chain specification data

**Example:**

```ts
const chainSpec = await client.getChainSpecData()
console.log(chainSpec.name) // "Polkadot"
console.log(chainSpec.genesisHash) // "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3"
```

**See also:** [Creating Clients - Chain Specification](/client/creating-clients#chain-specification)

---

## Metadata

### `getMetadata$(atBlock)`

Observable that retrieves the metadata for a specific block.

**Signature:**

```ts
getMetadata$(atBlock: HexString): Observable<Uint8Array>
```

**Parameters:**

- `atBlock` - The block hash to retrieve metadata for

**Returns:** `Observable<Uint8Array>` - Emits the SCALE-encoded metadata once and completes

**Example:**

```ts
const metadata$ = client.getMetadata$(blockHash)
metadata$.subscribe((metadata) => {
  console.log(`Metadata size: ${metadata.length} bytes`)
})
```

### `getMetadata(atBlock, signal?)`

Promise-based metadata retrieval for a specific block.

**Signature:**

```ts
getMetadata(
  atBlock: HexString,
  signal?: AbortSignal
): Promise<Uint8Array>
```

**Parameters:**

- `atBlock` - The block hash to retrieve metadata for
- `signal` - Optional AbortSignal for cancellation

**Returns:** `Promise<Uint8Array>` - SCALE-encoded metadata

**Example:**

```ts
const metadata = await client.getMetadata(blockHash)
console.log(`Metadata size: ${metadata.length} bytes`)

// With cancellation
const controller = new AbortController()
const metadata = await client.getMetadata(blockHash, controller.signal)
```

**See also:** [Metadata](/client/metadata)

---

## Block Operations

### `finalizedBlock$`

Observable that emits every new finalized block.

**Signature:**

```ts
finalizedBlock$: Observable<BlockInfo>

interface BlockInfo {
  hash: string
  number: number
  parent: string
}
```

**Returns:** `Observable<BlockInfo>` - Multicast and stateful Observable

**Properties:**

- Multicast - Multiple subscribers share the same subscription
- Stateful - Immediately emits the latest known finalized block to new subscribers

**Example:**

```ts
client.finalizedBlock$.subscribe((block) => {
  console.log(`Finalized block #${block.number}`)
  console.log(`Hash: ${block.hash}`)
})
```

### `getFinalizedBlock()`

Gets the current finalized block.

**Signature:**

```ts
getFinalizedBlock(): Promise<BlockInfo>
```

**Returns:** `Promise<BlockInfo>` - Latest known finalized block

**Example:**

```ts
const block = await client.getFinalizedBlock()
console.log(`Current finalized block: #${block.number}`)
```

### `bestBlocks$`

Observable that emits the best block chain.

**Signature:**

```ts
bestBlocks$: Observable<BlockInfo[]>
```

**Returns:** `Observable<BlockInfo[]>` - Array where:

- First element: latest best block
- Last element: latest finalized block
- Elements in between: unfinalized blocks in the chain

**Properties:**

- Multicast and stateful
- Immutable array structure (new array emitted each time, but child references are stable if unchanged)

**Example:**

```ts
client.bestBlocks$.subscribe((blocks) => {
  const bestBlock = blocks[0]
  const finalizedBlock = blocks[blocks.length - 1]

  console.log(`Best block: #${bestBlock.number}`)
  console.log(`Finalized block: #${finalizedBlock.number}`)
  console.log(`Unfinalized blocks: ${blocks.length - 1}`)
})
```

### `getBestBlocks()`

Gets the current best block chain.

**Signature:**

```ts
getBestBlocks(): Promise<BlockInfo[]>
```

**Returns:** `Promise<BlockInfo[]>` - Array of blocks from best to finalized

**Example:**

```ts
const blocks = await client.getBestBlocks()
console.log(`Best block: #${blocks[0].number}`)
```

### `blocks$`

Observable that emits all newly discovered blocks.

**Signature:**

```ts
blocks$: Observable<BlockInfo>
```

**Returns:** `Observable<BlockInfo>` - Emits every new block discovered

**Note:** Some blocks may never become part of the best chain or get finalized if they're on rejected forks.

**Example:**

```ts
client.blocks$.subscribe((block) => {
  console.log(`New block discovered: #${block.number}`)
})
```

### `hodlBlock(blockHash)`

Ensures a block stays available even after finalization.

**Signature:**

```ts
hodlBlock(blockHash: HexString): () => void
```

**Parameters:**

- `blockHash` - The block hash to retain

**Returns:** `() => void` - Callback function to release the block

**Use cases:**

- Performing multiple operations on the same block
- Working with old finalized blocks
- Building block explorers or analytics tools

**Example:**

```ts
const blockHash = "0x1234..."
const release = client.hodlBlock(blockHash)

try {
  await client.getBlockBody(blockHash)
  await client.getBlockHeader(blockHash)
} finally {
  release()
}
```

**See also:** [Blocks - Block Retention](/client/blocks#block-retention)

---

## Block Data Access

### `watchBlockBody(hash)`

Observable that retrieves a block body.

**Signature:**

```ts
watchBlockBody(hash: string): Observable<HexString[]>
```

**Parameters:**

- `hash` - Block hash, `"finalized"`, or `"best"`

**Returns:** `Observable<HexString[]>` - Emits the block body once and completes

**Example:**

```ts
client.watchBlockBody("finalized").subscribe((body) => {
  console.log(`Block has ${body.length} extrinsics`)
})
```

### `getBlockBody(hash)`

Promise-based block body retrieval.

**Signature:**

```ts
getBlockBody(hash: string): Promise<HexString[]>
```

**Parameters:**

- `hash` - Block hash, `"finalized"`, or `"best"`

**Returns:** `Promise<HexString[]>` - Array of SCALE-encoded extrinsics

**Example:**

```ts
const body = await client.getBlockBody("finalized")
console.log(`Block has ${body.length} extrinsics`)
```

### `getBlockHeader(hash?)`

Retrieves a block header.

**Signature:**

```ts
getBlockHeader(hash?: string): Promise<BlockHeader>

interface BlockHeader {
  parentHash: string
  number: number
  stateRoot: string
  extrinsicRoot: string
  digests: Array<Digest>
}
```

**Parameters:**

- `hash` - Block hash, `"finalized"` (default), or `"best"`

**Returns:** `Promise<BlockHeader>` - Block header information

**Example:**

```ts
const header = await client.getBlockHeader("finalized")
console.log(`Parent: ${header.parentHash}`)
console.log(`Number: ${header.number}`)
console.log(`State root: ${header.stateRoot}`)
```

**See also:** [Blocks - Block Data](/client/blocks#block-data)

---

## Transaction Operations

### `submit(transaction, at?)`

Submits a transaction and waits for it to be finalized.

**Signature:**

```ts
submit(
  transaction: HexString,
  at?: HexString
): Promise<TxFinalizedPayload>

interface TxFinalizedPayload {
  txHash: HexString
  ok: boolean
  events: Array<EventWithTopics>
  block: {
    hash: string
    number: number
    index: number
  }
}
```

**Parameters:**

- `transaction` - SCALE-encoded signed extrinsic
- `at` - Optional block to verify against (`"finalized"`, `"best"`, or block hash)

**Returns:** `Promise<TxFinalizedPayload>` - Transaction result when finalized

**Rejects when:**

- Transaction is invalid and can't be broadcasted
- Transaction becomes invalid during processing
- Network error occurs

**Example:**

```ts
const transaction = "0x..." // SCALE-encoded signed transaction

try {
  const result = await client.submit(transaction)
  console.log(`Finalized in block #${result.block.number}`)
} catch (error) {
  console.error("Transaction failed:", error)
}
```

### `submitAndWatch(transaction, at?)`

Submits a transaction and returns an Observable tracking its lifecycle.

**Signature:**

```ts
submitAndWatch(
  transaction: HexString,
  at?: HexString
): Observable<TxBroadcastEvent>

type TxBroadcastEvent =
  | TxBroadcasted
  | TxBestChainBlockIncluded
  | TxFinalized
  | TxInvalid
```

**Parameters:**

- `transaction` - SCALE-encoded signed extrinsic
- `at` - Optional block to verify against (`"finalized"`, `"best"`, or block hash)

**Returns:** `Observable<TxBroadcastEvent>` - Emits events throughout the transaction lifecycle

**Event Types:**

#### `TxBroadcasted`

```ts
interface TxBroadcasted {
  type: "broadcasted"
  txHash: string
}
```

#### `TxBestChainBlockIncluded`

```ts
interface TxBestChainBlockIncluded {
  type: "bestChainBlockIncluded"
  block: {
    hash: string
    number: number
    index: number
  }
  events: Array<EventWithTopics>
}
```

#### `TxFinalized`

```ts
interface TxFinalized {
  type: "finalized"
  block: {
    hash: string
    number: number
    index: number
  }
  events: Array<EventWithTopics>
}
```

#### `TxInvalid`

```ts
interface TxInvalid {
  type: "invalid"
  error: string
}
```

**Example:**

```ts
client.submitAndWatch(transaction).subscribe({
  next: (event) => {
    console.log(`Event: ${event.type}`)
    if (event.type === "finalized") {
      console.log(`Finalized in block #${event.block.number}`)
    }
  },
  error: (error) => console.error("Transaction error:", error),
  complete: () => console.log("Transaction complete"),
})
```

**See also:** [Transactions](/client/transactions)

---

## API Generation

### `getTypedApi(descriptors)`

Creates a type-safe API instance using chain descriptors.

**Signature:**

```ts
getTypedApi<D extends ChainDefinition>(descriptors: D): TypedApi<D>
```

**Parameters:**

- `descriptors` - Chain descriptors generated by `papi` CLI

**Returns:** `TypedApi<D>` - Type-safe API with:

- `query.*` - Storage queries
- `tx.*` - Transactions
- `event.*` - Events
- `constants.*` - Runtime constants
- `apis.*` - Runtime APIs

**Example:**

```ts
import { dot } from "@polkadot-api/descriptors"

const api = client.getTypedApi(dot)

// Now you have full type-safe access
const account = await api.query.System.Account.getValue(address)
console.log(`Balance: ${account.data.free}`)
```

**See also:**

- [API Access - TypedApi](/client/api-access#typed-api)
- [TypedApi Overview](/typed)

### `getUnsafeApi()`

Creates an advanced runtime API accessor without type safety.

**Signature:**

```ts
getUnsafeApi<D>(): UnsafeApi<D>
```

**Type Parameters:**

- `D` - Runtime API definitions (manually defined)

**Returns:** `UnsafeApi<D>` - Low-level API without runtime compatibility checks

**Warning:** For advanced users only. No runtime compatibility protection or type checking.

**Example:**

```ts
interface RuntimeApis {
  Core: {
    version: {
      args: []
      value: {
        spec_name: string
        spec_version: number
      }
    }
  }
}

const unsafeApi = client.getUnsafeApi<RuntimeApis>()
const version = await unsafeApi.Core.version()
console.log(`Spec version: ${version.spec_version}`)
```

**See also:**

- [API Access - UnsafeApi](/client/api-access#unsafe-api)
- [Unsafe API](/unsafe)

---

## Storage and Raw Access

### `rawQuery(storageKey, options?)`

Queries chain storage directly using storage keys.

**Signature:**

```ts
rawQuery(
  storageKey: HexString | string,
  options?: PullOptions
): Promise<HexString | null>

interface PullOptions {
  at?: HexString | "best" | "finalized"
}
```

**Parameters:**

- `storageKey` - Hex-encoded storage key or well-known key (e.g., `:code`)
- `options` - Optional query options:
  - `at` - Block to query at (defaults to finalized)

**Returns:** `Promise<HexString | null>` - Encoded value or `null` if key doesn't exist

**Well-known keys:**

- `:code` - Runtime code
- `:heappages` - Heap pages allocation
- `:child_storage:` - Child storage prefix

**Example:**

```ts
// Query runtime code
const code = await client.rawQuery(":code")
console.log(`Runtime code size: ${code?.length || 0} bytes`)

// Query at specific block
const value = await client.rawQuery("0x...", { at: blockHash })
```

**See also:** [Advanced Usage - Raw Storage](/client/advanced#raw-storage)

### `_request(method, params)`

Direct JSON-RPC call bypass (escape hatch).

**Signature:**

```ts
_request<Reply = any, Params extends Array<any> = any[]>(
  method: string,
  params: Params
): Promise<Reply>
```

**Type Parameters:**

- `Reply` - Expected return type
- `Params` - Parameter array type

**Parameters:**

- `method` - RPC method name
- `params` - Method parameters

**Returns:** `Promise<Reply>` - Response from RPC call

**Warning:** This bypasses PAPI's abstractions. Use only when necessary.

**Use cases:**

- Accessing debug endpoints
- Custom node extensions
- Non-standard RPC methods

**Example:**

```ts
// System information
const version = await client._request<string>("system_version", [])
console.log(`Node version: ${version}`)

// Network health
const health = await client._request<{
  isSyncing: boolean
  peers: number
}>("system_health", [])
console.log(`Peers: ${health.peers}`)
```

**See also:** [Advanced Usage - Direct RPC Calls](/client/advanced#direct-rpc-calls)

---

## Lifecycle Management

### `destroy()`

Destroys the client and releases all resources.

**Signature:**

```ts
destroy(): void
```

**Effects:**

- Unfollows the provider
- Disconnects from the chain
- Errors all active subscriptions
- Makes the client unusable

**Warning:** After calling `destroy()`, the client cannot be used anymore. Create a new client instance if needed.

**Example:**

```ts
try {
  await client.getFinalizedBlock()
} finally {
  client.destroy()
}
```

**See also:** [Creating Clients - Cleanup](/client/creating-clients#cleanup)

---

## Type Definitions

### `BlockInfo`

Basic block information.

```ts
interface BlockInfo {
  hash: string // Block hash
  number: number // Block number
  parent: string // Parent block hash
}
```

### `BlockHeader`

Complete block header information.

```ts
interface BlockHeader {
  parentHash: string
  number: number
  stateRoot: string
  extrinsicRoot: string
  digests: Array<Digest>
}
```

### `ChainSpecData`

Chain specification data.

```ts
interface ChainSpecData {
  name: string
  genesisHash: string
  properties: {
    ss58Format?: number
    tokenDecimals?: number[]
    tokenSymbol?: string[]
    [key: string]: any
  }
}
```

### `TxFinalizedPayload`

Transaction finalization result.

```ts
interface TxFinalizedPayload {
  txHash: HexString
  ok: boolean
  events: Array<EventWithTopics>
  block: {
    hash: string
    number: number
    index: number
  }
}
```

### `EventWithTopics`

Event with associated topics.

```ts
type EventWithTopics = SystemEvent["event"] & {
  topics: SystemEvent["topics"]
}
```

---

## Common Patterns

### Observable vs Promise

Most methods come in two flavors:

**Observable** (methods ending with `$`):

- Emit values over time
- Perfect for real-time monitoring
- Based on RxJS Observables
- Multicast and stateful

**Promise**:

- Return a single value
- Simpler for one-time queries
- Support AbortSignal for cancellation

```ts
// Observable - emits on every finalized block
client.finalizedBlock$.subscribe((block) => {
  console.log(`Block #${block.number}`)
})

// Promise - gets current finalized block
const block = await client.getFinalizedBlock()
```

### Block Specifiers

Many methods accept block specifiers:

- `"finalized"` - Current finalized block
- `"best"` - Current best block
- Block hash - Specific block (e.g., `"0x1234..."`)

```ts
await client.getBlockBody("finalized")
await client.getBlockBody("best")
await client.getBlockBody("0x1234...")
```

### Error Handling

Always handle errors appropriately:

```ts
// Promise-based
try {
  const result = await client.submit(transaction)
} catch (error) {
  console.error("Transaction failed:", error)
}

// Observable-based
client.submitAndWatch(transaction).subscribe({
  next: (event) => {
    /* handle event */
  },
  error: (error) => {
    /* handle error */
  },
  complete: () => {
    /* handle completion */
  },
})
```

---

## See Also

- [Creating Clients](/client/creating-clients) - Client setup and configuration
- [Metadata](/client/metadata) - Working with chain metadata
- [Blocks](/client/blocks) - Block monitoring and access
- [Transactions](/client/transactions) - Transaction submission
- [API Access](/client/api-access) - TypedApi and UnsafeApi
- [Advanced Usage](/client/advanced) - Best practices and patterns
