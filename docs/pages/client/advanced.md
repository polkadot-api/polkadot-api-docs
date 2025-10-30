# Advanced Usage

This section covers advanced `PolkadotClient` features including raw storage queries, direct RPC calls, and best practices for production applications.

## Raw Storage

The `rawQuery` method provides direct access to chain storage without type safety. Use this for custom storage queries or when working with storage keys not covered by TypedApi.

### Basic Usage

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Query using a well-known key
const value = await client.rawQuery(":code")
console.log(`Runtime code size: ${value?.length || 0} bytes`)

// Query using a hex-encoded storage key
const customKey = "0x26aa394eea5630e07c48ae0c9558cef7..."
const customValue = await client.rawQuery(customKey)
```

### Well-known Storage Keys

Substrate chains have several well-known storage keys:

| Key               | Description           |
| ----------------- | --------------------- |
| `:code`           | Runtime code          |
| `:heappages`      | Heap pages allocation |
| `:child_storage:` | Child storage prefix  |

### Query Options

`rawQuery` accepts optional parameters for specific blocks:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Query at finalized block (default)
const value1 = await client.rawQuery(":code")

// Query at specific block
const block = await client.getFinalizedBlock()
const value2 = await client.rawQuery(":code", {
  at: block.hash,
})

// Query at best block
const value3 = await client.rawQuery(":code", {
  at: "best",
})
```

### Return Value

`rawQuery` returns:

- `HexString` if the storage key exists and has a value
- `null` if the key doesn't exist or has no value

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const value = await client.rawQuery("0x...")

if (value === null) {
  console.log("Storage key does not exist")
} else {
  console.log(`Value: ${value}`)
}
```

### Computing Storage Keys

To query specific storage items, you need to compute the correct storage key. This typically involves:

1. Hashing the pallet name
2. Hashing the storage item name
3. Optionally hashing storage parameters for maps

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { blake2b } from "@noble/hashes/blake2"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function computeStorageKey(pallet: string, item: string): string {
  const encoder = new TextEncoder()
  const palletHash = blake2b(encoder.encode(pallet), { dkLen: 16 })
  const itemHash = blake2b(encoder.encode(item), { dkLen: 16 })

  return "0x" + toHex(palletHash) + toHex(itemHash)
}

// Example: Query System.Number
const numberKey = computeStorageKey("System", "Number")
const blockNumber = await client.rawQuery(numberKey)

console.log(`Current block number: ${blockNumber}`)
```

:::info
For most use cases, prefer using TypedApi's `query` methods which handle storage key computation automatically.
:::

## Direct RPC Calls

The `_request` method is an "escape hatch" for making direct JSON-RPC calls that aren't part of the standard spec-compliant API.

:::warning
`_request` bypasses PAPI's abstractions and directly calls the underlying provider. Use this only when necessary.
:::

### Basic Usage

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Call system_version
const version = await client._request<string>("system_version", [])
console.log(`Node version: ${version}`)

// Call with parameters
const health = await client._request<{
  isSyncing: boolean
  peers: number
  shouldHavePeers: boolean
}>("system_health", [])

console.log(`Syncing: ${health.isSyncing}`)
console.log(`Peers: ${health.peers}`)
```

### Type Parameters

`_request` accepts two type parameters:

```ts
_request<Reply, Params extends Array<any>>(
  method: string,
  params: Params
): Promise<Reply>
```

- `Reply`: The expected return type
- `Params`: Array type for parameters (optional, defaults to `any[]`)

### Example Use Cases

#### System Information

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const [version, name, chain] = await Promise.all([
  client._request<string>("system_version", []),
  client._request<string>("system_name", []),
  client._request<string>("system_chain", []),
])

console.log(`Node: ${name} v${version}`)
console.log(`Chain: ${chain}`)
```

#### Network Information

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const peers = await client._request<
  Array<{
    peerId: string
    roles: string
    bestHash: string
    bestNumber: number
  }>
>("system_peers", [])

console.log(`Connected to ${peers.length} peers`)
```

#### Custom Debug Endpoints

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Note: Debug endpoints may not be available on public nodes
const trace = await client._request<any>("state_traceBlock", [
  "0x1234...", // block hash
  "state", // targets
  "put", // storage changes
  null, // methods
])
```

### When to Use Direct RPC

Use `_request` when:

- Accessing debug or development endpoints
- Working with custom node extensions
- Calling non-standard RPC methods
- Building development tools

**Don't use** `_request` for:

- Standard chain queries (use TypedApi instead)
- Block monitoring (use block observables)
- Transaction submission (use `submit` or `submitAndWatch`)

## Best Practices

### Connection Management

#### Single Client Instance

Create one client per chain and reuse it:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")

// ---cut---
// ✅ Good - create once
const client = createClient(provider)

export { client } // Export for reuse across your application

// ❌ Bad - creating multiple clients
function getBalance() {
  const client = createClient(provider)
  // ...
}
```

#### Proper Cleanup

Always destroy clients when done:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ Use try-finally
try {
  await client.getFinalizedBlock()
} finally {
  client.destroy()
}

// ✅ Or in React (example)
// useEffect(() => {
//   const client = createClient(provider)
//   return () => client.destroy()
// }, [])
```

### Error Handling

#### Comprehensive Error Handling

Handle errors at appropriate levels:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
async function robustQuery() {
  try {
    const block = await client.getFinalizedBlock()
    return block
  } catch (error) {
    if (error instanceof Error && error.message.includes("network")) {
      console.error("Network error:", error)
      // Retry logic
    } else {
      console.error("Unexpected error:", error)
      throw error
    }
  }
}
```

#### Observable Error Handling

Handle Observable errors properly:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { catchError, of, retry } from "rxjs"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

client.finalizedBlock$
  .pipe(
    retry(3), // Retry up to 3 times
    catchError((error) => {
      console.error("Failed after retries:", error)
      return of(null) // Return fallback value
    }),
  )
  .subscribe((block) => {
    if (block) {
      console.log(`Block #${block.number}`)
    }
  })
```

### Performance Optimization

#### Batch Operations

Batch multiple queries when possible:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { dot } from "@polkadot-api/descriptors"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const api = client.getTypedApi(dot)

const addr1 = "1zugcavYA9yCuYwiEYeMHNJm9gXznYjNfXQjZsZukF1Mpow" as const
const addr2 = "1xF6Q5nVLpBcmNvP2cqVvdZ2K5Z3FpxP2cQ9LmX8HzL9VxL" as const
const addr3 = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5" as const

// ✅ Good - batch query
const balances = await api.query.System.Account.getValues([addr1, addr2, addr3])

// ❌ Bad - individual queries
const balance1 = await api.query.System.Account.getValue(addr1)
const balance2 = await api.query.System.Account.getValue(addr2)
const balance3 = await api.query.System.Account.getValue(addr3)
```

#### Cache Metadata

Implement metadata caching:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
class MetadataCache {
  private cache = new Map<string, Uint8Array>()

  async get(hash: string): Promise<Uint8Array> {
    if (!this.cache.has(hash)) {
      const metadata = await client.getMetadata(hash)
      this.cache.set(hash, metadata)
    }
    return this.cache.get(hash)!
  }

  clear() {
    this.cache.clear()
  }
}

const metadataCache = new MetadataCache()
```

See the [Metadata Caching recipe](/recipes/metadata-caching) for a complete implementation.

### Security Considerations

#### Validate User Input

Always validate addresses and other user input:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { dot } from "@polkadot-api/descriptors"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)
const api = client.getTypedApi(dot)

// ---cut---
function isValidAddress(address: string): boolean {
  // Implement proper address validation
  return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address)
}

async function getBalance(address: string) {
  if (!isValidAddress(address)) {
    throw new Error("Invalid address")
  }

  return api.query.System.Account.getValue(address as any)
}
```

#### Sanitize Storage Keys

When using `rawQuery` with user input:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
function isValidHex(hex: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(hex)
}

async function queryStorage(key: string) {
  if (!isValidHex(key)) {
    throw new Error("Invalid storage key")
  }

  return client.rawQuery(key)
}
```

#### Rate Limiting

Implement rate limiting for public-facing applications:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
class RateLimiter {
  private requests = new Map<string, number[]>()
  private maxRequests = 100
  private windowMs = 60000 // 1 minute

  async check(userId: string): Promise<boolean> {
    const now = Date.now()
    const userRequests = this.requests.get(userId) || []

    // Remove old requests
    const recentRequests = userRequests.filter(
      (time) => now - time < this.windowMs,
    )

    if (recentRequests.length >= this.maxRequests) {
      return false // Rate limit exceeded
    }

    recentRequests.push(now)
    this.requests.set(userId, recentRequests)
    return true
  }
}

const rateLimiter = new RateLimiter()

async function handleUserRequest(userId: string) {
  if (!(await rateLimiter.check(userId))) {
    throw new Error("Rate limit exceeded")
  }

  // Process request
  return client.getFinalizedBlock()
}
```

### Monitoring and Debugging

#### Log Important Events

Add logging for debugging:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
client.finalizedBlock$.subscribe((block) => {
  console.log(`[${new Date().toISOString()}] Finalized block #${block.number}`)
})

client.bestBlocks$.subscribe((blocks) => {
  const depth = blocks.length - 1
  if (depth > 5) {
    console.warn(`Chain depth is high: ${depth} unfinalized blocks`)
  }
})
```

#### Track Performance

Monitor operation performance:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
async function timedQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    console.log(`${name} took ${duration}ms`)
    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`${name} failed after ${duration}ms:`, error)
    throw error
  }
}

// Usage
const block = await timedQuery("getFinalizedBlock", () =>
  client.getFinalizedBlock(),
)
```

### Testing

#### Mock Client for Tests

Create mock clients for testing:

```ts
import { createClient } from "polkadot-api"
import type { PolkadotClient } from "polkadot-api"

function createMockClient(): PolkadotClient {
  return {
    getFinalizedBlock: async () => ({
      hash: "0x1234...",
      number: 1000,
      parent: "0xabcd...",
    }),
    // Mock other methods as needed
  } as PolkadotClient
}

// Use in tests
const mockClient = createMockClient()
const block = await mockClient.getFinalizedBlock()
```

## Common Patterns

### Waiting for Specific Conditions

Wait for a specific condition to be met:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { filter, firstValueFrom } from "rxjs"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

async function waitForBlockNumber(targetNumber: number) {
  await firstValueFrom(
    client.finalizedBlock$.pipe(
      filter((block) => block.number >= targetNumber),
    ),
  )
}

// Wait for block 1,000,000
await waitForBlockNumber(1_000_000)
console.log("Block 1,000,000 has been finalized!")
```

### Processing Block Ranges

Process historical blocks:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
async function processBlockRange(start: number, end: number) {
  const current = await client.getFinalizedBlock()

  for (let i = start; i <= end && i <= current.number; i++) {
    // Note: You'd need to get block hash by number using TypedApi
    console.log(`Processing block ${i}`)
  }
}
```

### Continuous Monitoring

Set up long-running monitoring:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
function startMonitoring() {
  const subscription = client.finalizedBlock$.subscribe({
    next: async (block) => {
      try {
        // Process block
        await processBlock(block)
      } catch (error) {
        console.error(`Error processing block ${block.number}:`, error)
      }
    },
    error: (error) => {
      console.error("Monitoring error:", error)
      // Restart monitoring after delay
      setTimeout(startMonitoring, 5000)
    },
  })

  // Cleanup on process exit
  process.on("SIGINT", () => {
    subscription.unsubscribe()
    client.destroy()
    process.exit()
  })
}

async function processBlock(block: any) {
  // Your processing logic
  console.log(`Processing block ${block.number}`)
}
```

## Learn More

- [Metadata Caching Recipe](/recipes/metadata-caching) - Production-ready metadata caching
- [Runtime Upgrade Recipe](/recipes/upgrade) - Handling runtime upgrades
- [Multiple Chains Recipe](/recipes/connect-to-multiple-chains) - Working with multiple chains
- [TypedApi Documentation](/typed) - Type-safe API usage
