# PolkadotClient

The `PolkadotClient` is the core entry point for interacting with Polkadot and Substrate-based chains using Polkadot-API. It provides a comprehensive, type-safe interface for all blockchain operations.

## Overview

`PolkadotClient` is created using the `createClient` function and provides:

- **Block monitoring** - Track finalized blocks, best blocks, and new blocks in real-time
- **Metadata access** - Retrieve and work with chain metadata
- **Transaction submission** - Submit and monitor transactions with full lifecycle tracking
- **Storage queries** - Query on-chain storage with type safety
- **API generation** - Create typed or unsafe APIs for advanced runtime interactions
- **Chain information** - Access chain specification data

## Getting Started

Create a client by providing a [JSON-RPC provider](/providers):

```ts twoslash
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"

const smoldot = start()
const chain = await smoldot.addChain({ chainSpec })

const client = createClient(getSmProvider(chain))
```

## Client Structure

The `PolkadotClient` interface is organized into several functional areas:

### Client Management

- [Creating and configuring clients](/client/creating-clients)
- [Resource cleanup and lifecycle management](/client/creating-clients#cleanup)
- [Chain specification data](/client/creating-clients#chain-specification)

### Metadata Operations

- [Observable-based metadata retrieval](/client/metadata)
- [Promise-based metadata retrieval](/client/metadata)

### Block Operations

- [Finalized block tracking](/client/blocks#finalized-blocks)
- [Best block chain monitoring](/client/blocks#best-blocks)
- [New block discovery](/client/blocks#new-blocks)
- [Block retention](/client/blocks#block-retention)
- [Block body and header access](/client/blocks#block-data)

### Transaction Operations

- [Promise-based submission](/client/transactions#submit)
- [Observable submission with event tracking](/client/transactions#submitandwatch)
- [Transaction lifecycle and events](/client/transactions#transaction-events)

### API Access

- [TypedApi for type-safe operations](/client/api-access#typed-api)
- [UnsafeApi for advanced runtime access](/client/api-access#unsafe-api)

### Advanced Features

- [Raw storage queries](/client/advanced#raw-storage)
- [Direct RPC calls](/client/advanced#direct-rpc)
- [Best practices and patterns](/client/advanced#best-practices)

## Observable vs Promise APIs

Many `PolkadotClient` methods come in two flavors:

**Observable APIs** (methods ending with `$`)

- Emit values over time as events occur
- Perfect for real-time monitoring and reactive applications
- Based on [RxJS Observables](https://rxjs.dev/)
- Multicast and stateful - replay latest state immediately

**Promise APIs**

- Return a single value
- Simpler for one-time queries
- Support AbortSignal for cancellation
- Built on top of Observable APIs

```ts twoslash
import { createClient } from "polkadot-api"
import { getSmProvider } from "polkadot-api/sm-provider"
import { chainSpec } from "polkadot-api/chains/polkadot"
import { start } from "polkadot-api/smoldot"

const smoldot = start()
const chain = await smoldot.addChain({ chainSpec })
const client = createClient(getSmProvider(chain))

// ---cut---
// Observable API - emits on every finalized block
client.finalizedBlock$.subscribe((block) => {
  console.log(`New finalized block: ${block.number}`)
})

// Promise API - gets current finalized block
const block = await client.getFinalizedBlock()
console.log(`Current finalized block: ${block.number}`)
```

## Next Steps

Explore the detailed documentation:

- [Creating Clients](/client/creating-clients) - Learn about client creation, configuration, and management
- [Metadata](/client/metadata) - Work with chain metadata
- [Blocks](/client/blocks) - Monitor and access blockchain data
- [Transactions](/client/transactions) - Submit and track transactions
- [API Access](/client/api-access) - Generate typed and unsafe APIs
- [Advanced Usage](/client/advanced) - Storage queries, raw RPC, and best practices
- [API Reference](/client/api-reference) - Complete reference for all methods and types
