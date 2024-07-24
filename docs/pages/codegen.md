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
  -n, --name <name>           Source from a well-known chain (choices: "ksmcc3", "paseo",
                              "polkadot", "polkadot_collectives", "rococo_v2_2", "westend2", [...]")
  --wasm <filename>           Source from runtime wasm file
  --no-persist                Do not persist the metadata as a file
  --skip-codegen              Skip running codegen after adding
  -h, --help                  display help for command
```

`papi add` registers a new chain. It requires a key, which is the name of the constant the codegen will create, and a source (`-f`, `-w`, `-c`, `-n`, or `--wasm`). The command download the fresh metadata for that chain and stores this information for later use into a `.papi` folder, with a configuration file `polkadot-api.json` and the metadata file `${key}.scale`.

You can add as many chains as you want, but each has to have a unique `key` (which must be a valid JS variable name).

`papi add` by default runs codegen automatically. If you want to add multiple chains without having to rerun codegen, you can use the flag `--skip-codegen`, and then run `papi generate` command once you want to run the codegen.

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

The code is generated into a [local package](https://docs.npmjs.com/cli/v9/configuring-npm/package-json/#local-paths) located in `.papi/descriptors`, which gets installed as a regular `@polkadot-api/descriptors` node modules package.

The folder `.papi` should be added to your source control repository. The only thing that should be ignored are the generated files from the codegen (`.papi/descriptors/dist`), but for git, that's already ignored by a pre-configured `.gitignore` inside `.papi`.

When the metadata is updated, the codegen will update the generated code and also the package version, to have package managers update the `@polkadot-api/descriptors` package.

:::info
If you're using yarn v1, you might need to run `yarn --force` after a codegen for it to detect the change.
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

These are consumed by `getTypedApi()`, which allows the IDE to reference any of these calls with autocompletion, etc. At runtime, it also contains a representation of the type for each of these calls, so that it can detect incompatibilities with the chain it's connected to.

The types are anonymous (they don't have a name in the metadata), but PolkadotAPI has a directory of well-known types for some of the most widely used Enums. If a chain is using one of these well-known types, it's also generated and exported.

:::warning
It's important to know that the descriptors exported by the codegen **should be treated as a black box**. When importing the descriptors of a chain, the type might not actually match what's in runtime, and its internals are subject to change. It has to be treated as an opaque token, passing it directly to `.getTypedApi()`.
:::

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
