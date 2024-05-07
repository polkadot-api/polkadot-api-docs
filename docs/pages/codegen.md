# Codegen

Technically, to connect to a chain, all you need is just the provider. But to interact with it, you need to know the list of storage, runtime, and transaction calls and their types.

During runtime, the library can request the metadata for the chain it's connected to, and from this, it generates all the codecs to interact with it. But as a developer, you need to get that information beforehand.

Polkadot-API has a CLI that downloads the metadata for a chain and then uses that metadata to generate all the type descriptors.

```sh
> npx papi add --help
Usage: polkadot-api add [options] <key>

Add a new chain spec to the list

Arguments:
  key                         Key identifier for the chain spec

Options:
  --config <filename>         Source for the config file
  -f, --file <filename>       Source from metadata encoded file
  -w, --wsUrl <URL>           Source from websocket URL
  -c, --chainSpec <filename>  Source from chain spec file
  -n, --name <name>           Source from a well-known chain (choices: "polkadot", "ksmcc3", "rococo_v2_2", "westend2")
  --no-persist                Do not persist the metadata as a file
  -h, --help                  display help for command
```

`papi add` registers a new chain. It requires a key, which is the JS variable name the codegen will create, and a source (`-f`, `-w`, `-c`, or `-n`). The command stores this information for later use into a configuration file `polkadot-api.json` and then downloads the fresh metadata into a file `${key}.scale`.

You can add as many chains as you want, but each has to have a unique `key` (which must be a valid JS variable name).

The CLI can then be used to generate the type descriptors for all of the added chains through the `generate` command.

```sh
npx papi generate
# `generate` is the default command, so you can just run
npx papi
```

It's recommended to add `papi` to the `postinstall` script in package.json to have it automatically generate the code after installation:

```js
{
  // ...
  "scripts": {
    // ...
    "postinstall": "papi"
  }
}
```

The code is generated into the `@polkadot-api/descriptors` node modules package

:::info
Some package managers clean the `node_modules` folder after installing or removing dependencies. When that happens, run the codegen again.
:::

## Contents

The generated code contains all of the types extracted from the metadata of all chains:

- For every pallet:
  - Storage queries
  - Transactions
  - Events
  - Errors
  - Constants
- Every runtime call

These are consumed by `getTypedApi()`, which allows the IDE to reference any of these calls with autocompletion, etc. At runtime, it also contains the checksum of each of these calls, so that it can detect incompatibilities with the chain it's connected to.

The types are anonymous (they don't have a name in the metadata), but PolkadotAPI has a directory of well-known types for some of the most widely used Enums. If a chain is using one of these well-known types, it's also generated and exported.

In the event that there are two chains with the two well-known types that have the same name but they are different, then the key is appended at the beginning of the type. For instance, if two chains `dot` and `ksm` might have a slightly different `PreimageRequestStatus`, in that case, the codegen exports `DotPreimageRequestStatus` and `KsmPreimageRequestStatus`.

## Usage

Import from `@polkadot-api/descriptors` every chain and type that you need, then use it through `getTypedApi()`.

```ts
import {
  dot,
  ksm,
  XcmVersionedMultiLocation,
  XcmVersionedXcm,
  XcmV2Instruction,
  XcmV2MultilocationJunctions,
} from "@polkadot-api/descriptors"

// ...

const dotClient = createClient(scProvider(WellKnownChain.polkadot).relayChain)
const ksmClient = createClient(scProvider(WellKnownChain.ksmcc3).relayChain)

const dotApi = dotClient.getTypedApi(dot)
const ksmApi = ksmClient.getTypedApi(ksm)

const xcmSendTx = dotApi.tx.XcmPallet.send({
  dest: XcmVersionedMultiLocation.V2({
    parents: 0,
    interior: XcmV2MultilocationJunctions.Here(),
  }),
  message: XcmVersionedXcm.V2([XcmV2Instruction.ClearOrigin()]),
})

const encodedData = await xcmSendTx.getEncodedData()

const finalizedCall = await xcmSendTx.signAndSubmit(signer)
```

:::info
`getTypedApi` has nearly no cost at runtime, so it can be safely called many times.
:::
