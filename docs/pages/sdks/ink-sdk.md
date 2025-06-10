# Ink! SDK

The Ink! SDK is a library for interacting with smart contracts, built on top of the [Ink! Client](/ink). It supports both pallet contracts (for ink!v5 or below) and pallet revive (for ink!v6 and above).

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
const dryRunResult = await psp22Deployer.deploy("new", {
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

## Revive addresses

Ink! v6+ contracts are deployed to pallet-revive, which took a few compromises in its design to make it compatible with EVM contracts.

PAPI ink-sdk supports both pallet-contracts and pallet-revive, and shares a common interface where **everything is supported for the both of them** (queries and dry-running instantiations with its events, sending and instantiating, and storage).

The main issue stems from the fact that contracts in revive work with ethereum-like addresses, represented as 20-byte hex strings. ink-sdk adds a few helpers to work with these:

### Account mapping

Before an account can call a contract, it must be mapped through the transaction `typedApi.tx.Revive.map_account()` (even for dry-running). [Link to the issue](https://github.com/paritytech/polkadot-sdk/issues/8619).

Revive sdk adds a function to easily check whether a given account is mapped or not, as it's not directly in storage:

```ts
const erc20Sdk = createReviveSdk(typedApi, contracts.erc20)
const isMapped = await erc20Sdk.addressIsMapped(ALICE)
if (!isMapped) {
  console.log("Alice needs to be mapped first!")
}
```

### Deployment address

pallet-revive currently [doesn't emit ContractInstantiated events](https://github.com/paritytech/polkadot-sdk/issues/8677), which mean that getting the address after deploying a contract is not straight-forward.

Note that if the contract emits an event through ContractEmitted, the sdk will pick that up in `readDeploymentEvents(finalizedTxEvent)`.

Fortunately, the assigned address it's deterministic, based either on signer accountId + contract code + constructor data + salt or just the signer accountId + nonce if salt is not used.

Revive sdk adds a couple of methods to get the estimated address given these parameters:

```ts
const erc20Sdk = createReviveSdk(typedApi, contracts.erc20)
const erc20Deployer = erc20Sdk.getDeployer(code)

// This will use the equation using nonce.
const estimatedAddressWithNonce = await deployer.estimateAddress("new", {
  origin: ADDRESS.alice,
  // Optionally can specify `nonce: {number}`, otherwise the sdk will query the
  // nonce for you.
})

// This will use the salt equation.
const estimatedAddressWithSalt = await deployer.estimateAddress("new", {
  origin: ADDRESS.alice,
  salt: Binary.fromHex(
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ),
})

// Given that the nonce equation doesn't use the contract code, ink-sdk exports
// a lower-level utility function to quickly calculate the address for an
// account and nonce:
import { getDeploymentAddressWithNonce } from "@polkadot-api/ink-sdk"

const manualAddress = getDeploymentAddressWithNonce(ADDRESS.alice, 123)
```

:::note
The address returned by dry-running (`erc20Deployer.dryRun("new")`) is currently bugged on the pallet and doesn't return the actual address it's going to deploy to. It was fixed but it regressed, [tracking issue](https://github.com/paritytech/contract-issues/issues/37).
You are encouraged to use `deployer.estimateAddress("new", {…})` to get your address instead.
:::

### Contract's AccountId

As contract addresses are now in ethereum-like format (20-byte hex strings), it's not straight-forward to get their AccountId, which can be used to get the contract's funds.

ink-sdk adds a property `accountId` to get the SS58 address of that contract

```ts
const erc20Sdk = createReviveSdk(typedApi, contracts.erc20)
const contract = erc20Sdk.getContract(ADDRESS.erc20)

const account = await typedApi.query.System.Account.getValue(contract.accountId)
console.log("Contract account", account)
```
