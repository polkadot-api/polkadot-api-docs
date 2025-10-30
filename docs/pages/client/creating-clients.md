# Creating Clients

The `createClient` function is the main entry point for creating a `PolkadotClient` instance.

## Basic Usage

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)
```

## With Smoldot Provider

For a light client approach using Smoldot:

```ts twoslash
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"

const smoldot = start()
const chain = await smoldot.addChain({ chainSpec })

const client = createClient(getSmProvider(chain))
```

## Configuration Options

`createClient` accepts an optional second parameter for configuration:

```ts
interface CreateClientOptions {
  // Custom metadata cache getter
  getMetadata?: (codeHash: HexString) => Promise<Uint8Array | null>
  // Custom metadata cache setter
  setMetadata?: (codeHash: HexString, metadata: Uint8Array) => void
}
```

### Metadata Caching

The options allow you to provide custom metadata caching functions. This is useful for persisting metadata across sessions:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")

// ---cut---
const metadataCache = new Map<string, Uint8Array>()

const client = createClient(provider, {
  getMetadata: async (codeHash) => {
    return metadataCache.get(codeHash) ?? null
  },
  setMetadata: (codeHash, metadata) => {
    metadataCache.set(codeHash, metadata)
  },
})
```

See the [Metadata Caching recipe](/recipes/metadata-caching) for production-ready patterns.

## Cleanup

Always clean up your client when you're done to release resources and close connections:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// When you're done with the client
client.destroy()
```

:::warning
After calling `destroy()`, the client cannot be used anymore. All subscriptions will error, and you'll need to create a new client instance if you want to continue interacting with the chain.
:::

### Cleanup in React

For React applications, use the `useEffect` cleanup function:

```tsx
import { useEffect, useState } from "react"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

function MyComponent() {
  const [client, setClient] = useState(null)

  useEffect(() => {
    const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
    const newClient = createClient(provider)
    setClient(newClient)

    // Cleanup function
    return () => {
      newClient.destroy()
    }
  }, [])

  // ... rest of component
}
```

## Chain Specification

Retrieve chain specification data, including genesis hash, chain name, and properties:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const chainSpec = await client.getChainSpecData()

console.log(chainSpec.name) // e.g., "Polkadot"
console.log(chainSpec.genesisHash) // Chain genesis hash
console.log(chainSpec.properties) // Chain properties like token decimals, SS58 format, etc.
```

### ChainSpecData Structure

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

## Multiple Clients

You can create multiple clients to connect to different chains simultaneously:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const polkadotProvider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const kusamaProvider = getWsProvider("wss://kusama-rpc.dwellir.com")

const polkadotClient = createClient(polkadotProvider)
const kusamaClient = createClient(kusamaProvider)

// Work with both chains
const [polkadotBlock, kusamaBlock] = await Promise.all([
  polkadotClient.getFinalizedBlock(),
  kusamaClient.getFinalizedBlock(),
])

console.log(`Polkadot: #${polkadotBlock.number}`)
console.log(`Kusama: #${kusamaBlock.number}`)
```

See the [Connect to Multiple Chains](/recipes/connect-to-multiple-chains) recipe for more details.

## Provider Selection

Choose the right provider for your use case:

### WebSocket Provider

**Best for**: Server-side applications, development, and when you have access to a reliable RPC node.

**Pros**:

- Fast and efficient
- Direct connection to full nodes
- Lower latency

**Cons**:

- Requires a trusted RPC endpoint
- Infrastructure dependency

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const client = createClient(getWsProvider("wss://polkadot-rpc.dwellir.com"))
```

### Smoldot Provider

**Best for**: Browser applications, fully decentralized apps, and when you want to minimize infrastructure dependencies.

**Pros**:

- No infrastructure needed
- Fully decentralized
- Works in browsers
- Light client security guarantees

**Cons**:

- Slower initial sync
- Higher resource usage in browser
- May take time to discover and sync

```ts twoslash
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"

const smoldot = start()
const chain = await smoldot.addChain({ chainSpec })
const client = createClient(getSmProvider(chain))
```

Learn more about providers in the [Providers](/providers) section.

## Error Handling

Handle errors during client creation and operations:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

try {
  const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
  const client = createClient(provider)

  try {
    const chainSpec = await client.getChainSpecData()
    console.log(`Connected to ${chainSpec.name}`)
  } catch (error) {
    console.error("Failed to get chain spec:", error)
  }
} catch (error) {
  console.error("Failed to create client:", error)
}
```

## Best Practices

### 1. Reuse Client Instances

Create a single client instance and reuse it throughout your application rather than creating new instances for each operation:

```ts
// ✅ Good - single instance
const client = createClient(provider)

// Use the same instance everywhere
await client.getFinalizedBlock()
await client.getMetadata()

// ❌ Bad - multiple instances
const client1 = createClient(provider)
await client1.getFinalizedBlock()

const client2 = createClient(provider)
await client2.getMetadata()
```

### 2. Always Clean Up

Use try-finally or cleanup functions to ensure resources are released:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
try {
  // Do work with client
  await client.getFinalizedBlock()
} finally {
  client.destroy()
}
```

### 3. Configure Operations Limit

Set up metadata caching based on your use case:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")

// ---cut---
// In-memory cache for development
const cache = new Map<string, Uint8Array>()

const client = createClient(provider, {
  getMetadata: async (hash) => cache.get(hash) ?? null,
  setMetadata: (hash, metadata) => cache.set(hash, metadata),
})

// For production, use persistent storage
// See the Metadata Caching recipe for examples
```
