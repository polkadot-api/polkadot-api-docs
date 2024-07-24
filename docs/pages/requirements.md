# Requirements

PAPI is designed to work flawlessly with almost any Polkadot-like chain. Even though, we have some requirements that the chain and environment have to fulfill.

## Environment

### NodeJS

PAPI is developed using the latest NodeJS LTS (currently `20.x`). The minimum required version is `20.6.0`, while we recommend the latest available release.

### Bun

In case you are using `bun` as your Javascript runtime, then Papi will work flawlessly with it! Just a small detail, if using a WebSocket provider, make sure you import it from `polkadot-api/ws-provider/web`!

### Browser

There is no specific required version, Polkadot-API works as expected in any modern browser.

## Chain

### Node

If using Polkadot-API client through Smoldot provider (light client) there are no specific requirements.

When using the WebSocket provider with a [Paritytech Polkadot-SDK](https://github.com/paritytech/polkadot-sdk) based node, there are three cases:

#### Polkadot-SDK `>= 1.11.0`

Polkadot-API will work without any issues. The WebSocket provider could be used without further issues:

```ts
import { createClient } from "polkadot-api"
import { WebSocketProvider } from "polkadot-api/ws-provider/web"

const client = createClient(WebSocketProvider("wss://your-rpc.your-url.xyz"))
```

#### Polkadot-SDK `1.1.0 <= x < 1.11.0`

If your node uses versions between `1.1` and `1.11`, you are still good to go with Polkadot-API. The node implements the JSON-RPC spec wrongly, but we provide some enhancers to workaround these flaws. You need to start the connection as follows:

```ts
import { createClient } from "polkadot-api"
import { WebSocketProvider } from "polkadot-api/ws-provider/web"
import compatEnhancer from "polkadot-api/polkadot-sdk-compat"

const client = createClient(
  compatEnhancer(WebSocketProvider("wss://your-rpc.your-url.xyz")),
)
```

#### Polkadot-SDK `< 1.1.0`

The JSON-RPC spec implemented prior `1.1` was really poor and we cannot feasibly workaround it. Polkadot-API does not support those nodes.

### Runtime

The most important thing to take into account is that the runtime needs to have a Runtime Metadata version `>=14`. We don't support any chain below that.

Besides that, Polkadot-API requires runtimes to implement some basic runtime calls. They are generally implemented in all chains developed using FRAME:

- In order to get the metadata, it needs `Metadata_metadata_versions` and `Metadata_metadata_at_version`. If they are not present, then `Metadata_metadata` needs to be there and answer a `v14` Metadata.
- To create and broadcast transactions, Polkadot-API needs `AccountNonceApi_account_nonce` and `TaggedTransactionQueue_validate_transaction`. To estimate the fees, it also requires `TransactionPaymentApi_query_info`.

In order to create transactions as well, the following storage entry is required for obtaining the genesis block-hash:

- `System.BlockHash`

And the following constant:

- `System.Version`, having `spec_version` and `transaction_version` fields.
