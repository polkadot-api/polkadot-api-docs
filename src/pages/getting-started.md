# Getting Started

## Community templates

If you want to quickly get a project up and running, check out the following community templates:

- [PAPI Starter Template](https://github.com/polkadot-api/starter-template): React, shadcn/ui, PolkaHub, React Query
- [Create Polkadot dApp](https://github.com/paritytech/create-polkadot-dapp): React, tailwind, ReactiveDot, DOTConnect
- [Create Dot App](https://github.com/preschian/create-dot-app): Many different template stacks, including React or Vue.
- [POP CLI](https://github.com/r0gue-io/pop-cli): Ink! smart contracts with frontend integration.

## Installation

Start by installing `polkadot-api`, and download the latest metadata from the chain you want to connect to and generate the types:

:::code-group

```sh [npm]
npm i polkadot-api

# `papi add` is the command
# `dot` is the name we're giving to this chain (can be any JS variable name)
# `-n polkadot` specifies to download the metadata from the well-known chain polkadot
npx papi add dot -n polkadot
# Wait for the latest metadata to download, then generate the types:
npx papi
```

```sh [pnpm]
pnpm add polkadot-api

# `papi add` is the command
# `dot` is the name we're giving to this chain (can be any JS variable name)
# `-n polkadot` specifies to download the metadata from the well-known chain polkadot
pnpm papi add dot -n polkadot
# Wait for the latest metadata to download, then generate the types:
pnpm papi
```

```sh [bun]
bun add polkadot-api

# `papi add` is the command
# `dot` is the name we're giving to this chain (can be any JS variable name)
# `-n polkadot` specifies to download the metadata from the well-known chain polkadot
bun papi add dot -n polkadot
# Wait for the latest metadata to download, then generate the types:
bun papi
```

:::

:::info
It's a really good idea to add papi to the "postinstall" script in package.json to automate generating the types after installation.
:::

Now you can create a `PolkadotClient` instance with a [provider](/providers) of your choice and start interacting with the API:

## 1. Create the provider and Start the client

:::code-group

```typescript twoslash [Smoldot]
// [!include ~/snippets/gettingStarted.ts:import]
// [!include ~/snippets/gettingStarted.ts:smoldot]
```

```typescript twoslash [WebSocket]
// [!include ~/snippets/gettingStarted.ts:import]
// [!include ~/snippets/gettingStarted.ts:websocket]
```

:::

## 2. Start consuming the client!

```typescript twoslash
// [!include ~/snippets/gettingStarted.ts:import]
// [!include ~/snippets/gettingStarted.ts:smoldot]

// ---cut---
// [!include ~/snippets/gettingStarted.ts:usage]
```

## 3. Discover our documentation!

To continue learning about PAPI, we recommend reading about:

1. [CLI & Codegen](/codegen). Fully grasp how to generate descriptors, and why does it matter for PAPI.
2. [Providers](/providers). Discover all options that our providers offer! You'll need a provider to proceed with the client.
3. [Client](/client). Get information for blocks, metadata, etc. Essentially, everything generic that does not depend on the runtime itself. For runtime specifics, keep reading...
4. [Typed API](/typed). The cherry on top of the cake! Interact with the network: transactions, storage entries, runtime apis, and others!
5. [Signers](/signers). You'll find here how PAPI abstracts away signers, and how can be used to sign transactions!
