# Requirements

PAPI is designed to work flawlessly with almost any Polkadot-like chain. Even though, we have some requirements that the chain and environment have to fulfill.

## Environment

### NodeJS

PAPI is developed using the latest NodeJS LTS (currently `22.x`). The minimum required version is `20.6.0`, while we recommend the latest available release.

### Bun

In case you are using `bun` as your Javascript runtime, then Papi will work flawlessly with it!

### Browser

There is no specific required version, Polkadot-API works as expected in any modern browser.

## Typescript

In order for PAPI to be imported correctly, and get all the types, the minimum working version of `typescript` is `5.2`.

## Chain

### Node

If using Polkadot-API client through Smoldot provider (light client) there are no specific requirements.

When using the WebSocket provider with a [Paritytech Polkadot-SDK](https://github.com/paritytech/polkadot-sdk) based node, there are three cases:

#### Polkadot-SDK `>= 1.11.0`

Polkadot-API will work without any issues. The WebSocket provider could be used without further issues:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"

const client = createClient(getWsProvider("wss://your-rpc.your-url.xyz"))
```

:::warning
A new error in Polkadot-SDK has been discovered, reported and solved in Polkadot-SDK `1.16.0` (or `stable-2409`). Therefore, we recommend anyone connecting through a WebSocket to use the same following recommendations as in Polkadot-SDK `1.1.0 <= x < 1.11.0`.
:::

#### Polkadot-SDK `1.1.0 <= x < 1.11.0`

If your node uses versions between `1.1` and `1.11`, you are still good to go with Polkadot-API. The node implements the JSON-RPC spec wrongly, but we provide some enhancers to workaround these flaws. You need to start the connection as follows:

```ts
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://your-rpc.your-url.xyz")),
)
```

:::warning
If you are using [`@polkadot-api/legacy-provider`](/providers#legacy-provider), don’t stack with polkadot-sdk-compat. Using the legacy-provider, it is unnecessary to add the Polkadot SDK compatibility layer as it already outputs a new‑spec‑compliant surface, so there’s nothing left for that middleware to “fix.”
:::

#### Polkadot-SDK `< 1.1.0`

The JSON-RPC spec implemented prior `1.1` was really poor and we cannot feasibly workaround it. Polkadot-API does not support those nodes.

### Runtime

The most important thing to take into account is that the runtime needs to have a Runtime Metadata version `>=14`. We don't support any chain below that.

Besides that, Polkadot-API requires runtimes to implement some basic runtime calls. They are generally implemented in all chains developed using FRAME:

- In order to get the metadata, it needs `Metadata_metadata_versions` and `Metadata_metadata_at_version`. If they are not present, then `Metadata_metadata` needs to be there and answer a `v14` Metadata.
- To create and broadcast transactions, Polkadot-API needs `AccountNonceApi_account_nonce` and `TaggedTransactionQueue_validate_transaction`. To estimate the fees, it also requires `TransactionPaymentApi_query_info`.

In order to create transactions as well, the following constant is required:

- `System.Version`, having `spec_version` and `transaction_version` fields.
