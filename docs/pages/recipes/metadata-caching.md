# Metadata Caching

## Introduction

In some advanced use cases, it can make sense to cache metadata to speed up the initial loading time of your DApp. However, this should be approached with care, as there are important implications to consider.

If you're using a light-client provider, caching metadata is unnecessary. The light client must always download, verify, compile, and instantiate the WASM code. Since the instantiated WASM can directly produce the metadata, caching offers no benefit in this scenario.

On the other hand, if you're using a "trusted" provider (e.g., `WebSocketProvider`), metadata caching can significantly improve startup performance. To ensure cached metadata stays in sync with the current runtime, PAPI uses the hash of the storage `:code` entry as a unique identifier. This ensures the cached metadata corresponds to the correct runtime.

## Using the Cache

The `createClient` function accepts a second argument: an optional object with two optional properties:

- `getMetadata`: A function that takes a `codeHash` (i.e., the `:code` hash, which serves as the metadata ID) and returns a `Promise<Uint8Array | null>`—the raw metadata if available, or `null` if not.

- `setMetadata`: A callback invoked when metadata is retrieved from a non-cache source. It receives the `codeHash` and its associated raw metadata (`Uint8Array`), allowing you to persist it however you see fit (e.g., localStorage, filesystem, etc.).

### CLI Support

If you're using the PAPI CLI to generate type descriptors for your chain, you can use the `getMetadata` helper from `@polkadot-api/descriptors`. It lazy-loads a JS file containing the raw metadata. For example:

```ts
import { dot, getMetadata } from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/web"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://dot-rpc.stakeworld.io")),
  { getMetadata },
)

const dotApi = client.getTypedApi(dot)
const accountInfo = await dotApi.query.System.Account.getValue(
  "16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J",
)
```

This will fetch the metadata from the descriptors and speed up the query, assuming the on-chain runtime matches the one used to generate the `dot` descriptors.

## Advanced Use Cases

### Web DApp: Using `localStorage`

To persist metadata across page reloads in a browser context:

```ts
import {
  dot,
  getMetadata as getDescriptorsMetadata,
} from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/web"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"
import { toHex, fromHex } from "@polkadot-api/utils" // Ensure hex helpers are imported

const setMetadata = (key: string, value: Uint8Array) => {
  window.localStorage.setItem(key, toHex(value))
}

const getMetadata = async (key: string) => {
  const hex = window.localStorage.getItem(key)
  if (hex) return fromHex(hex)

  const metadata = await getDescriptorsMetadata(key)
  if (metadata) setMetadata(key, metadata)
  return metadata
}

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://dot-rpc.stakeworld.io")),
  { getMetadata, setMetadata },
)

const dotApi = client.getTypedApi(dot)
const accountInfo = await dotApi.query.System.Account.getValue(
  "16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J",
)
```

### Bun Service: Filesystem Caching

If you're using Bun in a server-side environment, you can cache metadata to disk:

```ts
import {
  dot,
  getMetadata as getDescriptorsMetadata,
} from "@polkadot-api/descriptors"
import { createClient } from "polkadot-api"
import { getWsProvider } from "polkadot-api/ws-provider/web"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"

const setMetadata = (key: string, value: Uint8Array) => {
  Bun.write(Bun.file(`./cache/${key}.bin`), value)
}

const getMetadata = async (key: string) => {
  const file = Bun.file(`./cache/${key}.bin`)
  if (await file.exists()) return new Uint8Array(await file.arrayBuffer())

  const metadata = await getDescriptorsMetadata(key)
  if (metadata) setMetadata(key, metadata)
  return metadata
}

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://dot-rpc.stakeworld.io")),
  { getMetadata, setMetadata },
)

const dotApi = client.getTypedApi(dot)
const accountInfo = await dotApi.query.System.Account.getValue(
  "16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J",
)
```
