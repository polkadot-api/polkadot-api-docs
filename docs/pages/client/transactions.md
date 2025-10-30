# Transactions

The `PolkadotClient` provides methods to submit transactions (extrinsics) to the chain and monitor their lifecycle.

## Overview

Transactions can be submitted in two ways:

- **`submit`** - Promise-based, resolves when the transaction is finalized
- **`submitAndWatch`** - Observable-based, emits events throughout the transaction lifecycle

## Submit (Promise-based)

Submit a transaction and wait for it to be finalized:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const transaction = "0x..." // SCALE-encoded transaction

try {
  const result = await client.submit(transaction)

  console.log(`Transaction finalized in block ${result.block.number}`)
  console.log(`Block hash: ${result.block.hash}`)
  console.log(`Transaction index: ${result.block.index}`)
} catch (error) {
  console.error("Transaction failed:", error)
}
```

### Submit Parameters

```ts
submit(
  transaction: HexString,  // SCALE-encoded signed transaction
  at?: HexString          // Optional block to verify against
): Promise<TxFinalizedPayload>
```

- `transaction`: SCALE-encoded signed extrinsic
- `at`: Optional block specifier (`"finalized"`, `"best"`, or block hash) - the transaction validity is checked against this block

### TxFinalizedPayload

```ts
interface TxFinalizedPayload {
  block: {
    hash: string
    number: number
    index: number // Transaction index in the block
  }
  events: Array<SystemEvent>
}
```

## SubmitAndWatch (Observable-based)

Submit a transaction and receive events throughout its lifecycle:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const transaction = "0x..." // SCALE-encoded transaction

client.submitAndWatch(transaction).subscribe({
  next: (event) => {
    console.log(`Event type: ${event.type}`)

    if (event.type === "finalized") {
      console.log(`Finalized in block #${event.block.number}`)
    }
  },
  error: (error) => {
    console.error("Transaction error:", error)
  },
  complete: () => {
    console.log("Transaction complete")
  },
})
```

### Transaction Events

The `submitAndWatch` Observable emits different event types as the transaction progresses:

#### 1. Broadcasted Event

```ts
type TxBroadcasted = {
  type: "broadcasted"
  txHash: string
}
```

Emitted when the transaction is successfully broadcasted to the network.

#### 2. Best Chain Event

```ts
type TxBestChainBlockIncluded = {
  type: "bestChainBlockIncluded"
  block: {
    hash: string
    number: number
    index: number
  }
  events: Array<SystemEvent>
}
```

Emitted when the transaction is included in a best block (not yet finalized).

#### 3. Finalized Event

```ts
type TxFinalized = {
  type: "finalized"
  block: {
    hash: string
    number: number
    index: number
  }
  events: Array<SystemEvent>
}
```

Emitted when the transaction is included in a finalized block. The Observable completes after this event.

#### 4. Invalid Event

```ts
type TxInvalid = {
  type: "invalid"
  error: string
}
```

Emitted if the transaction is deemed invalid. The Observable errors after this event.

### Complete Event Type

```ts
type TxBroadcastEvent =
  | TxBroadcasted
  | TxBestChainBlockIncluded
  | TxFinalized
  | TxInvalid
```

## Creating Transactions

Transactions are typically created using the TypedApi. See the [Transactions documentation](/typed/tx) for details on creating and signing transactions.

Here's a brief example:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import type { dot } from "@polkadot-api/descriptors"

declare const descriptors: typeof dot
declare const signer: any

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const api = client.getTypedApi(descriptors)

// Create and sign a transaction
const signedTx = await api.tx.Balances.transfer_keep_alive({
  dest: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" as const,
  value: 1_000_000_000_000n,
}).signSubmitAndWatch(signer)
```

## Handling Transaction Results

### Checking Transaction Success

Check if the transaction succeeded by examining the events:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const result = await client.submit("0x...")

// Check for System.ExtrinsicSuccess event
const success = result.events.some(
  (event) => event.type === "System" && event.value.type === "ExtrinsicSuccess",
)

if (success) {
  console.log("Transaction succeeded!")
} else {
  console.log("Transaction failed!")
}
```

### Extracting Event Data

Events contain valuable information about what happened:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const result = await client.submit("0x...")

// Find specific events
result.events.forEach((event) => {
  console.log(`${event.type}.${event.value.type}`)

  // Example: Check for balance transfers
  if (event.type === "Balances" && event.value.type === "Transfer") {
    console.log("Transfer event:", event.value.value)
  }
})
```

## Error Handling

### Submit Errors

The `submit` method rejects if:

- The transaction is invalid and can't be broadcasted
- The transaction becomes invalid during processing
- A network error occurs

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
try {
  const result = await client.submit("0x...")
  console.log("Transaction succeeded")
} catch (error) {
  if (error.message.includes("Invalid")) {
    console.error("Transaction is invalid:", error)
  } else {
    console.error("Transaction failed:", error)
  }
}
```

### SubmitAndWatch Errors

With `submitAndWatch`, errors are delivered through the Observable's error handler:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
client.submitAndWatch("0x...").subscribe({
  next: (event) => {
    if (event.type === "invalid") {
      console.error("Transaction is invalid:", event.error)
    }
  },
  error: (error) => {
    console.error("Broadcast error:", error)
  },
  complete: () => {
    console.log("Transaction finalized")
  },
})
```

## Transaction Validation

The optional `at` parameter specifies which block to use for transaction validation:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Validate against finalized block (default)
await client.submit("0x...", "finalized")

// Validate against best block
await client.submit("0x...", "best")

// Validate against specific block
const block = await client.getFinalizedBlock()
await client.submit("0x...", block.hash)
```

This is useful when:

- You want to ensure the transaction is valid for a specific block
- You're working with multiple transactions that depend on each other
- You need to guarantee state consistency

## Use Cases

### Simple Transfer with TypedApi

The most common pattern uses TypedApi:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import type { dot } from "@polkadot-api/descriptors"

declare const descriptors: typeof dot
declare const signer: any

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const api = client.getTypedApi(descriptors)

const txHash = await api.tx.Balances.transfer_keep_alive({
  dest: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" as const,
  value: 1_000_000_000_000n,
}).signAndSubmit(signer)

console.log(`Transaction submitted: ${txHash}`)
```

See the [Simple Transfer recipe](/recipes/simple-transfer) for a complete example.

### Monitoring Transaction Progress

Track transaction progress through all stages:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
client.submitAndWatch("0x...").subscribe({
  next: (event) => {
    switch (event.type) {
      case "broadcasted":
        console.log("📡 Broadcasted to network")
        console.log(`Transaction hash: ${event.txHash}`)
        break

      case "bestChainBlockIncluded":
        console.log(`⏳ Included in best block #${event.block.number}`)
        console.log("Waiting for finalization...")
        break

      case "finalized":
        console.log(`✅ Finalized in block #${event.block.number}`)
        console.log(`Events: ${event.events.length}`)
        break

      case "invalid":
        console.log(`❌ Transaction invalid: ${event.error}`)
        break
    }
  },
  error: (error) => {
    console.error("❌ Broadcast failed:", error)
  },
  complete: () => {
    console.log("✅ Transaction complete")
  },
})
```

### Waiting for Multiple Confirmations

Wait for a transaction to be included in multiple best blocks before considering it safe:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
let bestBlockCount = 0
const REQUIRED_CONFIRMATIONS = 3

client.submitAndWatch("0x...").subscribe({
  next: (event) => {
    if (event.type === "bestChainBlockIncluded") {
      bestBlockCount++
      console.log(`Confirmation ${bestBlockCount}/${REQUIRED_CONFIRMATIONS}`)

      if (bestBlockCount >= REQUIRED_CONFIRMATIONS) {
        console.log("Transaction has enough confirmations!")
      }
    } else if (event.type === "finalized") {
      console.log("Transaction finalized!")
    }
  },
})
```

### Batch Transaction Submission

Submit multiple transactions and track them:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { mergeAll } from "rxjs"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
const transactions = ["0x...", "0x...", "0x..."]

const submissions = transactions.map((tx) => client.submitAndWatch(tx))

// Process all transactions concurrently
mergeAll()(submissions).subscribe({
  next: (event) => {
    if (event.type === "finalized") {
      console.log(`Transaction finalized in block ${event.block.number}`)
    }
  },
  complete: () => {
    console.log("All transactions complete")
  },
})
```

## Best Practices

### 1. Choose the Right Method

- Use `submit` for simple cases where you just need to know when it's finalized
- Use `submitAndWatch` when you need to track progress or react to intermediate states

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ Good - simple finalization
const result = await client.submit("0x...")

// ✅ Good - need progress updates
client.submitAndWatch("0x...").subscribe((event) => {
  updateUI(event)
})
```

### 2. Always Handle Errors

Transaction submission can fail for many reasons:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ Good - handles errors
try {
  await client.submit("0x...")
} catch (error) {
  handleError(error)
}

// ✅ Good - Observable error handling
client.submitAndWatch("0x...").subscribe({
  next: (event) => {},
  error: (error) => handleError(error),
})

function handleError(error: any) {
  console.error("Transaction failed:", error)
}
```

### 3. Validate Transaction State

Don't assume success - check the events:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ Good - checks for success
const result = await client.submit("0x...")
const success = result.events.some(
  (e) => e.type === "System" && e.value.type === "ExtrinsicSuccess",
)

if (!success) {
  console.error("Transaction included but failed")
}
```

### 4. Use TypedApi for Transaction Creation

Prefer TypedApi over manual transaction construction:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import type { dot } from "@polkadot-api/descriptors"

declare const descriptors: typeof dot
declare const signer: any

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// ✅ Preferred - type-safe with TypedApi
const api = client.getTypedApi(descriptors)
await api.tx.Balances.transfer_keep_alive({
  dest: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" as const,
  value: 1_000_000_000_000n,
}).signAndSubmit(signer)

// ❌ Avoid - manual construction is error-prone
const rawTx = "0x..." // manually constructed
await client.submit(rawTx)
```

### 5. Provide Validation Block When Needed

For dependent transactions, specify the validation block:

```ts twoslash
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const provider = getWsProvider("wss://polkadot-rpc.dwellir.com")
const client = createClient(provider)

// ---cut---
// Get a stable block reference
const block = await client.getFinalizedBlock()

// Submit multiple dependent transactions
await client.submit("0x...", block.hash)
await client.submit("0x...", block.hash)
```
