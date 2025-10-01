# Linked Accounts SDK

The linked accounts SDK resolves relationships between an account and the accounts that can act on its behalf through proxies or multisig accounts.

For proxies, it uses on-chain data. Multisig accounts are deterministic but not listed on-chain, so the SDK relies on a multisig provider (with several implementations available) to resolve them through an indexer.

## Getting Started

Install the Accounts SDK using your package manager:

```sh
npm i @polkadot-api/sdk-accounts
```

Then, initialize it by passing in the `typedApi` for your chain:

```ts
import {
  createLinkedAccountsSdk,
  subscanProvider,
} from "@polkadot-api/sdk-accounts"
import { dot } from "@polkadot-api/descriptors"
import { getWsProvider } from "polkadot-api/ws-provider"
import { createClient } from "polkadot-api"

const client = createClient(getWsProvider("wss://rpc.ibp.network/polkadot"))
const multisigProvider = subscanProvider("polkadot", process.env.SUBSCAN_KEY!)
const typedApi = client.getTypedApi(dot)

const linkedAccounts = createLinkedAccountsSdk(typedApi, multisigProvider)
```

## API

### `getLinkedAccounts$(address)`

Returns an `Observable<LinkedAccountsResult>` of the accounts linked to `address`. The observable emits a single value and then completes. The `LinkedAccountsResult` is an enum of 3 variants:

- `root`: no proxy or multisig relationships detected.
- `proxy`: the account delegates to other accounts. `value.addresses` contains the delegate SS58 strings.
- `multisig`: the address represents a multisig. `value.addresses` holds all signatories and `value.threshold` the approval threshold.

### `getNestedLinkedAccounts$(address)`

Returns an `Observable<NestedLinkedAccountsResult>` that recursively resolves linked accounts.

Essentially the same as `getLinkedAccounts$`, but that re-runs `getLinkedAccounts$` for each of the linked accounts (and so on, recursively).

The observable emits intermediate values by setting pending resolutions with `null`. Once everything has been explored, it completes. This is useful for visualising complex proxy or multisig hierarchies.

## Multisig Providers

A multisig provider is a simple interface that you can use to plug your own indexer or source. It's a function that given an address, it should return an object with the addresses and threshold, or null if it wasn't found.

```ts
export type MultisigProvider = (address: SS58String) => Promise<{
  addresses: SS58String[]
  threshold: number
} | null>
```

The SDK ships with pre-made providers for a couple of public indexers:

- `subscanProvider(chain: string, apiKey: string)`: queries using Subscan indexer, with your own [`apiKey`](https://pro.subscan.io).
- `novasamaProvider(chain: 'polkadot' | 'kusama')`: queries using Novasama indexer.
- `staticProvider(multisigs: Array<{ multisigAddr: SS58String, addresses: SS58String[], threshold: number }>)`: returns multisig information from a predefined list, useful for tests or offline scenarios.

Public indexers are subject to query limits and/or fees.

Given the interface is composable, there's also a couple of extra utilities to combine them:

- `fallbackMultisigProviders(...providers)`: chains providers and returns the first non-null response. This is useful because some indexers might not have indexed some multisigs, so you can just fall through many of them.
- `throttleMultisigProvider(provider, maxConcurrent, wait?)`: limits concurrent requests to avoid rate limit errors; when `wait` is `true`, additional calls are queued, otherwise they are dropped and fallback to `null`.

## Example

```ts
linkedAccounts.getLinkedAccounts$(address).subscribe((result) => {
  switch (result.type) {
    case "proxy":
      console.log("Delegated accounts", result.value.addresses)
      break
    case "multisig":
      console.log(
        `Multisig with threshold ${result.value.threshold}`,
        result.value.addresses,
      )
      break
    default:
      console.log("Root account")
  }
})
```
