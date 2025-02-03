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

## Whitelist

In order to reduce the size of PAPI descriptors bundle, one could filter which calls, queries, etc wants to use and ship with the dApp. This part is particularly interesting when developing web-based dApps, rather than NodeJS or Desktop apps, where bundle size is less critical.

In order to enable the whitelist feature of the codegen, one has to write a `whitelist.ts` file that our CLI can understand. The shape is as follows:

```ts
import { DotWhitelistEntry } from "@polkadot-api/descriptors"

const dotWhitelist: DotWhitelistEntry[] = [
  // this will get all calls, queries, and consts inside Balances pallet
  "*.Balances",

  // this just a specific tx
  "tx.XcmPallet.transfer_assets",

  // all queries inside system pallet
  "query.System.*",

  // all constants
  "const.*",
]

// the export name has to *EXACTLY* match `whitelist`
export const whitelist = [...dotWhitelist]
```

If you generated descriptors for key `dot` (or any other `key` you used to generate the descriptors) you will have that `<Key>WhitelistEntry` helper type that will provide type checking for your whitelist. You can explore all options that you can choose in your IDE. Of course, this can be multichain, let's see an example of it (for `dot` and `dotAh` descriptor keys).

```ts
import {
  DotAhWhitelistEntry,
  DotWhitelistEntry,
} from "@polkadot-api/descriptors"

const dotWhitelist: DotWhitelistEntry[] = ["tx.XcmPallet.transfer_assets"]

const ahWhitelist: DotAhWhitelistEntry[] = ["tx.PolkadotXcm.transfer_assets"]

export const whitelist = [...dotWhitelist, ...ahWhitelist]
```

This file could be placed anywhere, but we recommend placing it at `.papi/whitelist.ts`.

In order to generate descriptors taking into account the whitelist, the command should be `papi generate --whitelist .papi/whitelist.ts` (or just `papi --whitelist .papi/whitelist.ts`), or any other directory you chose to save your file. We recommend setting a script in your `package.json` that takes care of it.

A full working example of a dApp with whitelist could be found at [our repo](https://github.com/polkadot-api/polkadot-api/tree/main/examples/vite).

## Codegen without descriptors package

PAPI is designed to create a descriptors package, `@polkadot-api/descriptors`, allowing it to be imported like any other package. To ensure compatibility with most package managers and bundlers, the CLI automatically adds this package as a dependency to your project.

For advanced use cases, you can configure the CLI to perform only the code generation without installing it as a dependency. To do this, add the following option to your configuration file, `.papi/polkadot-api.json`:

```json
{
  "descriptorPath": …,
  "entries": { … },
  "options": {
    "noDescriptorsPackage": true
  }
}
```

:::info
You can also modify the `"descriptorPath"` property to specify a different path for generating the descriptors.
:::
