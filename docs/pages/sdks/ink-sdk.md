# Ink! SDK

The Ink! SDK is a library for interacting with smart contracts, which supports both pallet contracts (for ink!v5 or below) and pallet revive (for ink!v6 and above).

Built on top of the [Ink! Client](/ink), a set of low-level bindings for ink!, this SDK significantly simplifies interacting with contracts. It provides a developer-friendly interface that covers most dApps use cases.

## Getting Started

Install the sdk through your package manager:

```sh
pnpm i @polkadot-api/sdk-ink
```

Begin by generating the type definitions for your chain and contract. For example, using a PSP22 contract on the test Paseo Pop network:

```sh
pnpm papi add -w wss://rpc1.paseo.popnetwork.xyz pop
pnpm papi ink add ./psp22.json # Path to the .contract or .json metadata file
```

:::note
You can find a working example in [the ink-sdk repo](https://github.com/polkadot-api/papi-sdks/tree/main/examples/ink-playground). An example PSP22 contract and its metadata is available in the `./contracts/psp22_mod` folder.
:::

This process uses the name defined in the contract metadata to export it as a property of `contracts` in `@polkadot-api/descriptors`. For this example, the contract name is "psp22." You can now instantiate the Ink! SDK:

```ts
import { contracts, pop } from "@polkadot-api/descriptors"
import { createInkSdk } from "@polkadot-api/sdk-ink"
import { createClient } from "polkadot-api"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"
import { getWsProvider } from "polkadot-api/ws-provider/web"

const client = createClient(
  withPolkadotSdkCompat(getWsProvider("wss://rpc1.paseo.popnetwork.xyz")),
)
const typedApi = client.getTypedApi(pop)

const psp22Sdk = createInkSdk(typedApi, contracts.psp22)
```

:::note
When using a ink!v6 contract, use `createReviveSdk` instead of `createInkSdk`. Both have the same API, but revive sdk uses the pallet-revive instead, which is where ink!v6 contracts are deployed.
:::

The SDK provides two main functions for different workflows:

- `getDeployer(code: Binary)`: Returns an API for deploying contracts.
- `getContract(address: SS58String)`: Returns an API for interacting with deployed contracts.

## Contract Deployer

```ts
import { Binary } from "polkadot-api";

const wasmBlob = ...; // Uint8Array of the contract WASM blob.
const code = Binary.fromBytes(wasmBlob);

const psp22Deployer = psp22Sdk.getDeployer(code);
```

The deployer API supports two methods: one for dry-running deployments and another for actual deployments.

When deploying, the SDK calculates all parameters, requiring only the constructor arguments defined in the contract.

To calculate the gas limit and storage deposit limit required, the SDK also needs the origin account the transaction will be sent from. So it either uses the origin account or the gas limit if you already have it.

The "salt" parameter ensures unique contract deployments. By default, it is empty, but you can provide a custom value for deploying multiple instances of the same contract.

```ts
// Deploy psp22
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const tx = psp22Deployer.deploy("new", {
  origin: ALICE,
  data: {
    supply: 1_000_000_000_000n,
    decimals: 9,
  },
})

// `tx` is a regular transaction that can be sent with `.signSubmitAndWatch`, `.signAndSubmit`, etc.
const result = await tx.signAndSubmit(aliceSigner)

// To get the resulting address the contract was deployed to, we can pass the events back into the SDK:
const data: Array<{
  address: string
  contractEvents: EventDescriptor[]
}> = psp22Sdk.readDeploymentEvents(result.events)
```

Dry-running takes in the same arguments, but returns a Promise with the result directly instead:

```ts
const dryRunResult = await psp22Deployer.dryRun("new", {
  origin: ALICE,
  data: {
    supply: 1_000_000_000_000n,
    decimals: 9,
  },
})

if (dryRunResult.success) {
  console.log(dryRunResult.value)
  /*
  dryRunResult.value has:
  {
    // Resulting address of contract
    address: SS58String;
    // Events that would be generated when deploying
    events: EventDescriptor[];
    // Weight required
    gasRequired: Gas;
  }
  */

  // The dry-run result also has a method to get the transaction to perform the actual deployment.
  const deploymentResult = await dryRunResult.value
    .deploy()
    .signAndSubmit(aliceSigner)
}
```

## Contract API

The contract API targets a specific instance of a contract by address, providing multiple interaction functions:

```ts
const PSP22_INSTANCE = "5F69jP7VwzCp6pGZ93mv9FkAhwnwz4scR4J9asNeSgFPUGLq"
const psp22Contract = psp22Sdk.getContract(PSP22_INSTANCE)

// You optionally can make sure the hash hasn't changed by checking compatibility
if (!(await psp22Contract.isCompatible())) {
  throw new Error("Contract has changed")
}
```

### Query

Sending a query (also known as dry-running a message), can be sent directly through the `.query()` method, passing the name of the message, origin and arguments:

```ts
console.log("Get balance of ALICE")
const result = await psp22Contract.query("PSP22::balance_of", {
  origin: ALICE,
  data: {
    owner: ALICE,
  },
})

if (result.success) {
  console.log("balance of alice", result.value.response)
  console.log("events", result.value.events)

  // The dry-run result also has a method to get the transaction to send the same message to the contract.
  const callResult = await result.value.send().signAndSubmit(aliceSigner)
} else {
  console.log("error", result.value)
}
```

### Send

Sending a message requires signing a transaction, which can be created with the `.send()` method:

```ts
console.log("Increase allowance")
const allowanceTxResult = await psp22Contract
  .send("PSP22::increase_allowance", {
    origin: ADDRESS.alice,
    data,
  })
  .signAndSubmit(aliceSigner)

if (allowanceTxResult.ok) {
  console.log("block", allowanceTxResult.block)
  // The events generated by this contract can also be filtered using `filterEvents`:
  console.log("events", psp22Contract.filterEvents(allowanceTxResult.events))
} else {
  console.log("error", allowanceTxResult.dispatchError)
}
```

### Redeploy

Contract instances can also be redeployed without the need to have the actual WASM blob. This is similar to using the [Contract Deployer](#contract-deployer), but it's done directly from the contract instance:

```ts
const salt = Binary.fromHex("0x00")
const result = await psp22Contract.dryRunRedeploy("new", {
  data,
  origin: ADDRESS.alice,
  options: {
    salt,
  },
})

if (result.success) console.log("redeploy dry run", result)

const txResult = await psp22Contract
  .redeploy("new", {
    data,
    origin: ADDRESS.alice,
    options: {
      salt,
    },
  })
  .signAndSubmit(signer)

const deployment = psp22Sdk.readDeploymentEvents(ADDRESS.alice, txResult.events)
```

### Storage API

The storage of a contract is a tree structure, where you can query the values that are singletons, but for those that can grow into lists, maps, etc. they have to be queried separately.

This SDK has full typescript support for storage. You start by selecting where to begin from the tree, and you'll get back an object with the data within that tree.

```ts
const storage = psp22Contract.getStorage()

const root = await storage.getRoot()
if (root.success) {
  /* result.value is what the psp22 contract has defined as the root of its storage
  {
    name: Option<string>,
    symbol: Option<string>,
    decimals: number,
    data: {
      total_supply: bigint,
      allowances: (key: [SS58String, SS58String]) => Promise<Result<bigint>>,
      balances: (key: SS58String) => Promise<Result<bigint>>
    }
  }
  */
}
```

If inside of that subtree there are storage entries that have to be queried separately, the SDK turns those properties into functions that query that. In the example above, `data.allowances` and `data.balances` are maps that require one specific key to perform the query, so they have been turned into async functions.

If you don't need the data of the root and just want to query for a specific balance directly, you can get any nested subtree by calling `.getNested()`:

```ts
const aliceBalance = await storage.getNested("data.balances", ALICE)
if (aliceBalance.success) {
  console.log("Alice balance", aliceBalance.value)
}
```

## Revive Addresses

Ink! v6+ contracts are deployed to `pallet-revive`, which took several design compromises to make it compatible with EVM contracts.

PAPI’s `ink-sdk` supports both `pallet-contracts` and `pallet-revive`, providing a unified interface where **all features are supported for both** (including queries, dry-run instantiations with event handling, sending and instantiating contracts, and storage access).

The main issue comes from the fact that contracts in Revive use Ethereum-like addresses, represented as 20-byte hex strings. `ink-sdk` includes several helpers to work with these addresses:

### Account Mapping

Before an account can interact with a contract, it must be mapped using the transaction `typedApi.tx.Revive.map_account()` (even for dry-runs). [See issue #8619](https://github.com/paritytech/polkadot-sdk/issues/8619).

The Revive SDK provides a convenient function to check whether a given account is already mapped (as this information is not directly accessible from storage):

```ts
const erc20Sdk = createReviveSdk(typedApi, contracts.erc20)
const isMapped = await erc20Sdk.addressIsMapped(ALICE)
if (!isMapped) {
  console.log("Alice needs to be mapped first!")
}
```

### Deployment Address

`pallet-revive` currently [does not emit `ContractInstantiated` events](https://github.com/paritytech/polkadot-sdk/issues/8677), which makes it less straightforward to retrieve a contract address after deployment.

However, if the contract emits an event via `ContractEmitted`, the SDK will detect it in `readDeploymentEvents(finalizedTxEvent)`.

Fortunately, contract addresses are deterministic: they are derived either from the signer’s `accountId` + contract code + constructor data + salt, or just the signer’s `accountId` + nonce if no salt is used.

The Revive SDK provides methods to estimate the contract address given these parameters:

```ts
const erc20Sdk = createReviveSdk(typedApi, contracts.erc20)
const erc20Deployer = erc20Sdk.getDeployer(code)

// Estimate address using nonce:
const estimatedAddressWithNonce = await erc20Deployer.estimateAddress("new", {
  origin: ADDRESS.alice,
  // Optionally, specify `nonce: {number}`. Otherwise, the SDK will query it for you.
})

// Estimate address using salt:
const estimatedAddressWithSalt = await erc20Deployer.estimateAddress("new", {
  origin: ADDRESS.alice,
  salt: Binary.fromHex(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ),
})

// Since the nonce-based equation does not depend on contract code, ink-sdk exposes
// a lower-level utility function for quick address calculation:
import { getDeploymentAddressWithNonce } from "@polkadot-api/sdk-ink"

const manualAddress = getDeploymentAddressWithNonce(ADDRESS.alice, 123)
```

### Contract's AccountId

Because contract addresses are now in Ethereum-like format (20-byte hex strings), retrieving their `AccountId` (SS58) is not straightforward, which could be used for example to check the contract's funds.

`ink-sdk` provides an `accountId` property to get the SS58 address of the contract:

```ts
const erc20Sdk = createReviveSdk(typedApi, contracts.erc20)
const contract = erc20Sdk.getContract(ADDRESS.erc20)

const account = await typedApi.query.System.Account.getValue(contract.accountId)
console.log("Contract account", account)
```
