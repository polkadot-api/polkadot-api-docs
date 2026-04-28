---
title: PAPI Basics for AI Agents
description: Use when users ask to build, explain, review, or debug code that uses Polkadot-API (PAPI) to interact with Polkadot-based chains. Covers provider choice, client creation, codegen and descriptors, typed queries, transactions, signers, and when to use the unsafe API.
---

# PAPI Basics

This page is meant to help AI agents and LLMs work with applications or libraries built on `polkadot-api`.

It is not a replacement for the full docs. Its purpose is to keep the agent on the correct path quickly, then point it to the right documentation area for exact API details.

## Default approach

Prefer the safer `TypedApi` workflow unless the user explicitly needs a dynamic runtime-driven tool:

1. Create a provider.
2. Create a client with `createClient(provider)`.
3. Generate descriptors from a chain with the PAPI CLI.
4. Import the generated chain descriptor from `@polkadot-api/descriptors`.
5. Build a typed API with `client.getTypedApi(descriptor)`.
6. Use `typedApi.query`, `typedApi.tx`, `typedApi.event`, `typedApi.apis`, and `typedApi.constants`.

## Canonical workflow

### 1. Install and generate descriptors

For normal application code, assume the recommended path is:

- install `polkadot-api`
- register one or more chains with `papi add`
- run `papi generate` (or just `papi`, as it's the default command)
- import descriptors from `@polkadot-api/descriptors`

The CLI is equipped with `--help` on every command that shows how to use it. For instance, `papi add --help` will show the docs for adding a chain.

Examples for adding a chain:

```sh
# Adding polkadot asset hub with smoldot (slower but decentralised)
papi add -n polkadot_asset_hub dotAh

# Alternatively, adding asset hub from a known websocket RPC (faster)
papi add -w wss://polkadot-asset-hub-rpc.polkadot.io dotAh
```

In this example, `dotAh` is the chain name we've given, but it can be set to anything else. It's important to remember it though, as the descriptors are exported with that name: `import { dotAh } from '@polkadot-api/descriptors'`.

Important:

- Do not manually install `@polkadot-api/descriptors` from the npm registry. This package is generated locally and installed by the PAPI CLI.
- Treat generated descriptors as opaque tokens. Do not depend on their internals.
- Pass them directly to `client.getTypedApi(...)`.
- In general, descriptors should match the chain or chains the app is connected to.
- In some multi-chain cases, one descriptor set is enough if the interactions used are known to stay compatible across those chains, but one set of descriptors per chain is often the safer default.
- Add a postinstall script to run `papi generate` on every new install.
- It's not needed to run `papi add` again for the same chain. Running `papi update` will re-fetch the metadata from the chain in case it changes.

Use docs routes for more information:

- `https://papi.how/getting-started`
- `https://papi.how/codegen`
- `https://papi.how/recipes/connect-to-multiple-chains`

### 2. Choose a provider

PAPI centers around `createClient(provider)`.

First-class providers:

- Smoldot provider from `polkadot-api/sm`: prefer when the user wants a light-client approach: Trustless, truly decentralised.
- WebSocket provider from `polkadot-api/ws`: prefer when the user prefers a centralized, trusted connection.

If the user asks about middleware, logging, or observability, look at provider enhancers.

Use docs routes for more information:

- `https://papi.how/providers`: Intro to providers.
- `https://papi.how/providers/sm`: Smoldot provider.
- `https://papi.how/providers/ws`: WebSocket provider.
- `https://papi.how/providers/enhancers`: Logs provider, detailed `JsonRpcProvider` interface.

### 3. Create the client

Use `createClient(provider)` as the top-level entry point.

The client starts the connection and is the place for:

- chain and metadata access
- block streams (finalized, best) and block queries (body, header)
- raw storage access through `rawQuery(...)`
- creating `TypedApi` and `UnsafeApi`

If code needs chain display metadata such as token symbol or decimals, inspect `await client.getChainSpecData()` first. In many chains that information can be found inside `properties`, but the shape is not guaranteed, so do not assume a universal schema without checking what the connected chain returns.

Use docs route:

- `https://papi.how/client`

### 4. Prefer `TypedApi`

For runtime-specific interactions, prefer:

```ts
const api = client.getTypedApi(descriptor)
```

This is the default for:

- storage queries
- transactions
- events
- runtime APIs
- constants

Use docs routes:

- `https://papi.how/typed`: Intro.
- `https://papi.how/typed/events`: Watching chain events.
- `https://papi.how/typed/apis`: Running Runtime Calls or Runtime APIs.
- `https://papi.how/typed/constants`: Querying constant values from the chain.
- `https://papi.how/typed/view`: Running View Functions.

## Queries

When helping with storage:

- all entries have the following methods: `getValue`, `watchValue`, and `getKey`
- entries with keys also support `getValues`, `getEntries`, and `watchEntries`
- `at` usually defaults to `"finalized"` unless the caller chooses `"best"` or a block hash

Practical guidance:

- Use `getValue` for one-off reads.
- Use `watchValue` for subscribing to a single storage item over time.
- Use `getValues` for a known list of keys.
- Use `getEntries` or `watchEntries` when the user needs iteration over a map or partial map. Most of the queries should be fine, but they should not be used for storage entries that have massive amounts of data (like `typedApi.query.System.Account.getEntries()` would have to fetch every single account in storage, which would take too long to load).
- Do not pass `{ at: "finalized" }` just to repeat the default. Prefer `watchValue()` or `getValue()` with no options unless a non-default block target is actually needed.
- Use `watchValue` and especially `watchEntries` sparingly: they create continuous subscriptions and are heavier than one-off reads. Consider whether a one-off query (`getValue`), polling (for example `getValue` on an interval), or a real-time subscription is the right fit for the dApp. For instance:
  - Subscribing to the user's balance to display it in the screen usually makes sense, as you want to always show the latest: `typedApi.query.System.Account.watchValue(accountId)`.
  - Watching the current staking era maybe makes more sense polling, specially as it doesn't change often and you can predict when the next era will change.
  - Querying the description for a bounty can usually get away with a one-off read: It's not critical, and it can get refreshed when the user changes screen.

For low-level storage access:

- use `typedApi.query.Pallet.Entry.getKey(...)` to build the storage key
- use `client.rawQuery(...)` to fetch the raw encoded value
- prefer this path only when the user explicitly needs raw storage access or is building lower-level tooling

Use docs route:

- `https://papi.how/typed/queries`
- `https://papi.how/client`
- `https://papi.how/static`

## Transactions

The normal flow is:

1. Build a transaction from `typedApi.tx.Pallet.Call(...)`.
2. Sign it with a `PolkadotSigner`.
3. Submit it with `signAndSubmit` or `signSubmitAndWatch`.

Important details:

- `tx.decodedCall` is useful when another extrinsic needs a nested call, such as proxy or batch-style workflows.
- `getEncodedData()` returns the call data as a `Promise<Uint8Array>`.
- `getBareTx()` returns a bare/unsigned extrinsic ready for submission. This is the unsigned counterpart to `sign()`: both produce an extrinsic that can later be submitted with `client.submit(...)` or `client.submitAndWatch(...)`.
- `getEstimatedFees(...)` is used to get the estimated fees
- `getPaymentInfo(...)` is a superset of `getEstimatedFees`: It also returns the weight.
- `txFromCallData(...)` creates a `Transaction` object from a callData.

Do not recommend building extrinsics by hand unless the user explicitly needs a low-level path.

Use docs route:

- `https://papi.how/typed/tx`

### Signed vs unsigned submission

Keep this distinction clear:

- `tx.sign(signer)` returns a signed extrinsic ready for submission. It is tied to a specific signer/account.
- `tx.getBareTx()` returns an unsigned extrinsic ready for submission. Unsigned transactions are much less common and are only valid for calls that the runtime accepts as unsigned/operational.
- `client.submit(...)` and `client.submitAndWatch(...)` can submit either form, as long as the extrinsic itself is valid for the target chain/runtime.
- Most of the time, prefer `tx.signAndSubmit(...)` or `tx.signSubmitAndWatch(...)` instead of splitting signing/building from submission.

## Binary data

PAPI works with `Uint8Array` for binary data, but it also provides helpers that should be preferred over ad-hoc conversions.

When writing or reviewing code:

- prefer `Binary` from `polkadot-api` for text/hex/binary conversion
- use `Binary.fromText(...)`, `Binary.toText(...)`, `Binary.fromHex(...)`, and `Binary.toHex(...)` instead of hand-rolled `TextEncoder` or `TextDecoder` conversions when the goal is just to work with PAPI binary values
- use `mergeUint8` from `polkadot-api/utils` when combining binary chunks

Use docs routes:

- `https://papi.how/types`
- `https://papi.how/v2migration`

## Signers

PAPI uses the library-agnostic `PolkadotSigner` interface.

When users ask about wallet integration:

- prefer extension-based signers for browser wallets
- use raw signers for custom cryptographic integrations

Do not assume that an arbitrary wallet object is directly usable without adapting it to `PolkadotSigner`.

Use docs routes:

- `https://papi.how/signers`
- `https://papi.how/signers/extensions`
- `https://papi.how/signers/polkadot-signer`

### Signer from private key

If the user has a private key or seed phrase, use external tools combined with `getPolkadotSigner`.

Remember that unencrypted private keys or seed phrases for real accounts should NEVER be stored in a file. The only exception is for test accounts or playgrounds, but any account whose private key or seed phrase is being used through `getPolkadotSigner` should be considered as if it was compromised.

If possible, prefer to use wallets instead: either browser extensions, applications, air-gapped devices or hardware wallets.

To create the signing function required by `getPolkadotSigner`, use:

- From Ed25519 private-key: `@noble/curves/ed25519.js`
- From Sr25519 private-key: `@scure/sr25519`
- From seed phrase / mnemonic and derivation path: `@polkadot-labs/hdkd` together with `@polkadot-labs/hdkd-helpers`

Use docs routes:

- `https://papi.how/signers/raw`

## Unsafe API

Only recommend `client.getUnsafeApi()` when the user explicitly needs runtime-dynamic behavior or cannot rely on generated descriptors.

Good fits:

- chain consoles
- metadata explorers
- tooling that adapts to arbitrary runtimes at runtime
- One-off scripts to run something quickly (as it has the advantage that you don't need to generate chain information with the CLI)

Avoid recommending it for normal app code. It does not provide the compatibility protections of `TypedApi`, nor the intellisense typing.

Use docs route:

- `https://papi.how/unsafe`

## Common corrections

When you see these assumptions, correct them:

- "Unsafe API is just a more convenient Typed API."
  It is an advanced escape hatch with fewer guarantees.

- "Any signer object from another library should work directly."
  The supported abstraction is `PolkadotSigner`.

- "`@polkadot/api` or other `@polkadot/*` packages are PAPI / Polkadot-API."
  Those are Polkadot.js / PJS packages. PAPI packages use `polkadot-api`, `polkadot-api/*`, or `@polkadot-api/*`.

- "Any descriptor set is fine as long as TypeScript compiles."
  Descriptors should generally match the chain or chains the app connects to. In some multi-chain cases one descriptor set is enough for stable common interactions, but per-chain descriptors are often the safer default.

## Response strategy

When answering or writing code:

- Prefer concise, canonical PAPI patterns over clever abstractions.
- Default to the typed API and generated descriptors.
- If the target chain is explicit and fixed, it can be acceptable to hardcode token symbol or decimals. Otherwise, inspect `client.getChainSpecData()` first and never assume a specific shape under `properties`.
- If the user needs raw storage data, show `getKey(...)` plus `client.rawQuery(...)` instead of inventing storage keys manually.
- If code touches binary payloads, prefer PAPI's `Binary` helpers and `mergeUint8` over ad-hoc byte manipulation.
- Reference the smallest relevant docs route when exact semantics matter.
- If the user is debugging runtime compatibility, verify whether their descriptors and target chain metadata are aligned.

## Minimal example shape

Use this as the default mental model:

```ts
import { createClient } from "polkadot-api"
import { dotAh } from "@polkadot-api/descriptors"

const client = createClient(provider)
const typedApi = client.getTypedApi(dotAh)
```

From there:

- reads go through `typedApi.query`
- transactions go through `typedApi.tx`
- chain-generic operations stay on `client`
