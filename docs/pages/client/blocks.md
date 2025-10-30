# Blocks

The `PolkadotClient` provides comprehensive block monitoring and data access capabilities, supporting both Observable and Promise-based patterns.

## Finalized Blocks

Finalized blocks are blocks that have been irreversibly committed to the chain. Once finalized, they cannot be reverted.

### Observable API

Subscribe to receive all finalized blocks in real-time:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
client.finalizedBlock$.subscribe((block) => {
  console.log(`Finalized block #${block.number}`)
  console.log(`Hash: ${block.hash}`)
  console.log(`Parent: ${block.parent}`)
})
```

:::info
`finalizedBlock$` is a **multicast and stateful** Observable that immediately emits the latest known finalized block to new subscribers.
:::

### Promise API

Get the current finalized block:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const block = await client.getFinalizedBlock()

console.log(`Current finalized block: #${block.number}`)
console.log(`Hash: ${block.hash}`)
```

## Best Blocks

The best block is the head of the best chain - the chain the node believes is the canonical chain. The best block may not be finalized yet.

### Observable API

Subscribe to the best block chain:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
client.bestBlocks$.subscribe((blocks) => {
  const bestBlock = blocks[0]
  const finalizedBlock = blocks[blocks.length - 1]

  console.log(`Best block: #${bestBlock.number}`)
  console.log(`Finalized block: #${finalizedBlock.number}`)
  console.log(`Unfinalized blocks: ${blocks.length - 1}`)
})
```

The `bestBlocks$` Observable emits an **immutable array** where:

- First element (`blocks[0]`): latest best block
- Last element (`blocks[blocks.length - 1]`): latest finalized block
- Elements in between: unfinalized blocks in the chain

:::info
`bestBlocks$` is also **multicast and stateful**, replaying the current state to new subscribers. The array structure is immutable - a new array is emitted each time, but child references are stable if unchanged.
:::

### Promise API

Get the current best block chain:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const blocks = await client.getBestBlocks()

console.log(`Best block: #${blocks[0].number}`)
console.log(`Finalized block: #${blocks[blocks.length - 1].number}`)
```

## New Blocks

Monitor all newly discovered blocks, including those that might not become part of the best chain:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
client.blocks$.subscribe((block) => {
  console.log(`New block discovered: #${block.number}`)
  console.log(`Hash: ${block.hash}`)
})
```

:::note
Some blocks emitted by `blocks$` may never become part of the best chain or get finalized if they're on a fork that gets rejected.
:::

## BlockInfo Structure

All block observables and methods return `BlockInfo` objects with the following structure:

```ts
interface BlockInfo {
  hash: string // Block hash
  number: number // Block number
  parent: string // Parent block hash
}
```

## Block Retention

By default, the client may drop information about old finalized blocks to save resources. Use `hodlBlock` to prevent this:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const blockHash = "0x1234..."

// Keep the block in memory
const release = client.hodlBlock(blockHash)

// Do operations with the block
await client.getBlockBody(blockHash)
await client.getBlockHeader(blockHash)

// When done, release it
release()
```

:::info
"hodl" is crypto slang for "hold". This method ensures blocks remain available even after finalization when you need to perform multiple operations on them.
:::

### When to Use Block Retention

Use `hodlBlock` when:

- Performing multiple operations on the same block
- Working with old finalized blocks
- Building block explorers or analytics tools
- Caching block data for repeated access

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
async function analyzeBlock(hash: string) {
  const release = client.hodlBlock(hash)

  try {
    const [header, body, metadata] = await Promise.all([
      client.getBlockHeader(hash),
      client.getBlockBody(hash),
      client.getMetadata(hash),
    ])

    // Analyze block data
    console.log(`Block has ${body.length} extrinsics`)
  } finally {
    release()
  }
}
```

## Block Data

### Block Body

Get the extrinsics (transactions) in a block:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Promise-based
const body = await client.getBlockBody("finalized")
console.log(`Block has ${body.length} extrinsics`)

// Observable-based
client.watchBlockBody("finalized").subscribe((body) => {
  console.log(`Block has ${body.length} extrinsics`)
})
```

The body is an array of SCALE-encoded extrinsics (hex strings).

### Block Header

Get the block header:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const header = await client.getBlockHeader("finalized")

console.log(`Parent: ${header.parentHash}`)
console.log(`Number: ${header.number}`)
console.log(`State root: ${header.stateRoot}`)
console.log(`Extrinsic root: ${header.extrinsicRoot}`)
```

### Block Specifiers

Both `getBlockBody`, `watchBlockBody`, and `getBlockHeader` accept:

- `"finalized"` - the current finalized block (default for `getBlockHeader`)
- `"best"` - the current best block
- A specific block hash - e.g., `"0x1234..."`

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Get finalized block body
const finalizedBody = await client.getBlockBody("finalized")

// Get best block body
const bestBody = await client.getBlockBody("best")

// Get specific block body
const specificBody = await client.getBlockBody("0x1234...")

// Get specific block header
const header = await client.getBlockHeader("0x1234...")
```

## Use Cases

### Real-time Block Monitoring

Monitor finalized blocks for a blockchain explorer:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
client.finalizedBlock$.subscribe(async (block) => {
  const body = await client.getBlockBody(block.hash)
  const header = await client.getBlockHeader(block.hash)

  console.log(`Block #${block.number}`)
  console.log(`  Extrinsics: ${body.length}`)
  console.log(`  State root: ${header.stateRoot}`)
})
```

### Waiting for Finalization

Wait for a specific block number to be finalized:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { filter, firstValueFrom } from "rxjs"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

async function waitForBlock(targetNumber: number) {
  await firstValueFrom(
    client.finalizedBlock$.pipe(
      filter((block) => block.number >= targetNumber),
    ),
  )

  console.log(`Block #${targetNumber} is now finalized`)
}

await waitForBlock(1000000)
```

### Detecting Chain Reorganizations

Monitor the best block chain for reorganizations:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
let previousBestHash: string | null = null

client.bestBlocks$.subscribe((blocks) => {
  const currentBestHash = blocks[0].hash

  if (previousBestHash && previousBestHash !== currentBestHash) {
    // Check if this is a reorg or just a new block
    const wasPreviousInChain = blocks.some((b) => b.hash === previousBestHash)

    if (!wasPreviousInChain) {
      console.log("Chain reorganization detected!")
    }
  }

  previousBestHash = currentBestHash
})
```

### Block Range Processing

Process a range of blocks:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { filter, take } from "rxjs"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

async function processBlockRange(startBlock: number, endBlock: number) {
  return new Promise<void>((resolve) => {
    client.finalizedBlock$
      .pipe(
        filter((block) => block.number >= startBlock),
        take(endBlock - startBlock + 1),
      )
      .subscribe({
        next: async (block) => {
          console.log(`Processing block #${block.number}`)
          // Process block...
        },
        complete: () => {
          console.log("Range processing complete")
          resolve()
        },
      })
  })
}
```

## Best Practices

### 1. Choose the Right Observable

- Use `finalizedBlock$` for confirmed, irreversible data
- Use `bestBlocks$` when you need to react to the latest state quickly
- Use `blocks$` for comprehensive monitoring including forks

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ For transaction confirmation
client.finalizedBlock$.subscribe((block) => {
  // Check if transaction is in this block
})

// ✅ For real-time UI updates
client.bestBlocks$.subscribe((blocks) => {
  // Update UI with latest state
})

// ✅ For comprehensive monitoring
client.blocks$.subscribe((block) => {
  // Track all blocks including forks
})
```

### 2. Use Block Retention Wisely

Only use `hodlBlock` when necessary:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const hash = "0x1234..." // Block hash to analyze

// ✅ Good - multiple operations on same block
const release = client.hodlBlock(hash)
await client.getBlockBody(hash)
await client.getBlockHeader(hash)
release()

// ❌ Bad - not needed for single operation
const hash2 = "0xabcd..."
const release2 = client.hodlBlock(hash2)
await client.getBlockBody(hash2)
release2() // Unnecessary overhead
```

### 3. Handle Subscriptions Properly

Always unsubscribe when done:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const subscription = client.finalizedBlock$.subscribe((block) => {
  console.log(`Block #${block.number}`)
})

// When done
subscription.unsubscribe()
```

### 4. Combine Block Specifiers

Use `"finalized"` and `"best"` for convenience:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ Convenient for common cases
const finalizedBody = await client.getBlockBody("finalized")
const bestBody = await client.getBlockBody("best")

// ✅ Use specific hash when you need a particular block
const block = await client.getFinalizedBlock()
const body = await client.getBlockBody(block.hash)
```
