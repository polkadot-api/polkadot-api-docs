# Metadata

Chain metadata describes the runtime's structure, including pallets, storage items, transactions, events, and more. The `PolkadotClient` provides methods to retrieve metadata for any block.

## Overview

Metadata is essential for:

- Understanding available runtime calls and storage
- Type-safe interaction with the chain
- Generating TypedApi instances
- Decoding chain data

## Getting Metadata

### Promise-based

Get metadata for a specific block using a Promise:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Get metadata for the finalized block
const finalizedBlock = await client.getFinalizedBlock()
const metadata = await client.getMetadata(finalizedBlock.hash)

console.log(`Metadata size: ${metadata.length} bytes`)
```

### Observable-based

Subscribe to metadata using an Observable:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const finalizedBlock = await client.getFinalizedBlock()

client.getMetadata$(finalizedBlock.hash).subscribe((metadata) => {
  console.log(`Metadata size: ${metadata.length} bytes`)
})
```

:::info
The Observable-based `getMetadata$` emits once and immediately completes. It's mainly used for composing with other Observables.
:::

## Cancellation

The Promise-based `getMetadata` supports cancellation via `AbortSignal`:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const controller = new AbortController()

// Start fetching metadata
const metadataPromise = client.getMetadata("0x1234...", controller.signal)

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000)

try {
  const metadata = await metadataPromise
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    console.log("Metadata fetch was cancelled")
  }
}
```

## Metadata Format

The returned metadata is a `Uint8Array` containing SCALE-encoded metadata prefixed with:

1. The metadata magic number
2. The metadata version byte

This follows the [`RuntimeMetadataPrefixed`](https://github.com/paritytech/frame-metadata/blob/main/frame-metadata/src/lib.rs) encoding.

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const metadata = await client.getMetadata("0x1234...")

// First 4 bytes are the magic number "meta"
console.log(new TextDecoder().decode(metadata.slice(0, 4))) // "meta"

// 5th byte is the version
console.log(metadata[4]) // e.g., 15 for V15
```

## Metadata Versioning

Polkadot-API automatically retrieves the most modern stable metadata version supported by the chain. The client handles:

- Detecting available metadata versions
- Requesting the best version
- Falling back if needed

You don't need to worry about metadata versions - the client handles it transparently.

## Block-Specific Metadata

Different blocks may have different metadata if a runtime upgrade occurred:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Get metadata before an upgrade
const oldBlockHash = "0xabcd..."
const oldMetadata = await client.getMetadata(oldBlockHash)

// Get metadata after an upgrade
const newBlockHash = "0xef01..."
const newMetadata = await client.getMetadata(newBlockHash)

// Metadata might be different
const metadataChanged = oldMetadata.length !== newMetadata.length
console.log(`Metadata changed: ${metadataChanged}`)
```

## Caching Metadata

For production applications, consider caching metadata to improve performance. See the [Metadata Caching recipe](/recipes/metadata-caching) for implementation details.

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Simple in-memory cache
const metadataCache = new Map<string, Uint8Array>()

async function getCachedMetadata(blockHash: string): Promise<Uint8Array> {
  if (!metadataCache.has(blockHash)) {
    const metadata = await client.getMetadata(blockHash)
    metadataCache.set(blockHash, metadata)
  }
  return metadataCache.get(blockHash)!
}

// First call fetches from chain
const metadata1 = await getCachedMetadata("0x1234...")

// Second call uses cache
const metadata2 = await getCachedMetadata("0x1234...")
```

## Using Metadata with TypedApi

Metadata is used internally by TypedApi to provide type-safe access to chain operations:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import type { dot } from "@polkadot-api/descriptors"

declare const descriptors: typeof dot
const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// TypedApi automatically handles metadata internally
const api = client.getTypedApi(descriptors)

// When you call methods, metadata is fetched as needed
const constants = await api.constants.System.BlockLength()
```

Learn more about TypedApi in the [API Access](/client/api-access) section.

## Monitoring Runtime Upgrades

You can monitor for runtime upgrades by watching the finalized block and checking if metadata changes:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
let previousMetadataLength = 0

client.finalizedBlock$.subscribe(async (block) => {
  const metadata = await client.getMetadata(block.hash)

  if (metadata.length !== previousMetadataLength) {
    console.log(`Runtime upgrade detected at block #${block.number}`)
    console.log(`New metadata size: ${metadata.length} bytes`)
    previousMetadataLength = metadata.length
  }
})
```

See the [Prepare for Runtime Upgrade recipe](/recipes/upgrade) for production-ready patterns.

## Best Practices

### 1. Cache Metadata

Metadata doesn't change often, so cache it:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Use a Map-based cache
const cache = new Map<string, Uint8Array>()
const MAX_CACHE_SIZE = 100

async function getMetadataWithCache(hash: string) {
  if (!cache.has(hash)) {
    // Simple eviction if cache is full
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }

    cache.set(hash, await client.getMetadata(hash))
  }
  return cache.get(hash)!
}
```

### 2. Use TypedApi Instead

You rarely need to work with raw metadata directly. Use TypedApi for most use cases:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import type { dot } from "@polkadot-api/descriptors"

declare const descriptors: typeof dot
const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ Preferred - use TypedApi
const api = client.getTypedApi(descriptors)
const balance = await api.query.System.Account.getValue("address...")

// ❌ Rarely needed - raw metadata
const metadata = await client.getMetadata("0x1234...")
```

### 3. Handle Runtime Upgrades

Be prepared for metadata changes in long-running applications:

```ts
// Listen for runtime upgrades
client.finalizedBlock$.subscribe(async (block) => {
  // Check runtime version or metadata
  // Reinitialize TypedApi if needed
})
```

### 4. Provide AbortSignal for Long Operations

When fetching metadata during user-initiated operations, provide cancellation:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const controller = new AbortController()

// Example: cancel on user action
// button.addEventListener("click", () => controller.abort())

const metadata = await client.getMetadata("0x1234...", controller.signal)
```
