# Staking SDK

The Staking SDK simplifies common interactions with the Polkadot staking pallet:

- Fetches validator performance data for each era.
- Computes nominator rewards and active validator sets.
- Integrates the account balance with nomination status and locks.
- Lists and inspects nomination pools, including commission details.
- Builds batched staking transactions for bonding, nominating, payee updates, and unwinding positions.

## Getting Started

Install the Staking SDK using your package manager:

```sh
npm i @polkadot-api/sdk-staking
```

Then, create a client and pass it to `createStakingSdk`.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
```

## Validators

The SDK queries all the information that represents the state of a validator for a specific era:

```ts
interface ValidatorRewards {
  address: SS58String
  // In [0-1]
  commission: number
  blocked: boolean
  points: number
  reward: bigint
  commissionShare: bigint
  nominatorsShare: bigint
  activeBond: bigint
  selfStake: bigint
  nominatorCount: number
}
```

It provides two methods:

- `getEraValidators(era)`: Gets all the validators for a specific era.
- `getValidatorRewards(addr, era)`: Gets the information for one specific validator.

### `getEraValidators`

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
//---cut---
const activeEra = await typedApi.query.Staking.ActiveEra.getValue()
const prevEra = activeEra!.index - 1
const { validators, totalRewards, totalBond } =
  await stakingSdk.getEraValidators(prevEra)

console.log("Validators in era", prevEra)
validators.forEach((validator) => {
  console.log(validator.address, validator.reward.toString())
})
console.log("Era reward pool:", totalRewards.toString())
console.log("Total active bond:", totalBond.toString())
```

### `getValidatorRewards`

Use `getValidatorRewards` when you only need a single validator.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
const activeEra = await typedApi.query.Staking.ActiveEra.getValue()
const prevEra = activeEra!.index - 1
//---cut---
const validatorRewards = await stakingSdk.getValidatorRewards(
  "13UVJyLnbVp8c4FQeiGRMVBP7xph2wHCuf2RzvyxJomXJ7RL",
  prevEra,
)

if (validatorRewards) {
  const commissionPct = validatorRewards.commission * 100
  console.log(
    `Validator earned ${validatorRewards.reward} (commission ${commissionPct.toFixed(
      2,
    )}%)`,
  )
}
```

## Nominators

Due to the storage structure of the pallet, getting the nomination information for one specific address, like the active bond, active validators, etc. is very expensive: To query one specific address, it needs to fetch every other active nominator for all validators.

The SDK adds a caching mechanism per-era, so that the same work can be reused across different requests.

### `getNominatorActiveValidators`

`getNominatorActiveValidators` fetches the validators where a nominator’s stake was active during the era, including its effective bond per validator.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
const activeEra = await typedApi.query.Staking.ActiveEra.getValue()
const prevEra = activeEra!.index - 1
//---cut---
const active = await stakingSdk.getNominatorActiveValidators(
  "1zugcUbZDfeG...",
  prevEra,
)
console.log(active)
```

### `getNominatorRewards`

`getNominatorRewards` summarizes the rewards and commission attributed to the nominator in the chosen era. It contains a super-set of information from `getNominatorActiveValidators`, since it combines it with the rewards for each validator.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
const activeEra = await typedApi.query.Staking.ActiveEra.getValue()
const prevEra = activeEra!.index - 1
//---cut---
const rewards = await stakingSdk.getNominatorRewards("1zugcUbZDfeG...", prevEra)
console.log("Total era reward:", rewards.total.toString())
console.log("Per validator:", rewards.byValidator)
```

### `getActiveNominators`

You can also query for the list of all nominators with `getActiveNominators`.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
const activeEra = await typedApi.query.Staking.ActiveEra.getValue()
const prevEra = activeEra!.index - 1
//---cut---
const nominators = await stakingSdk.getActiveNominators(prevEra)
console.log("Unique active nominators:", nominators.length)
```

## Manage Nominations

The SDK provides transaction builders that batch the required staking calls based on the current state of the account.

### `upsertNomination`

Use `upsertNomination` to adjust bond size, validator targets, or reward destination in a single callable batch. The helper will look at the current status of that nominator and only apply the appropriate changes. It will also first try to rebond unbonding funds before bonding unlocked ones.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
//---cut---
const tx = await stakingSdk.upsertNomination("1zugcUbZDfeG...", {
  bond: 50_000_000_000n,
  validators: [
    "1463EpGxchpSL1PeDnBEHUdQk2Mty8jXYEAJwQAVaHR6oWG6",
    "13UVJyLnbVp8c4FQeiGRMVBP7xph2wHCuf2RzvyxJomXJ7RL",
  ],
})
// @noErrors: 2304
await tx.signAndSubmit(signer)
```

### `stopNomination`

`stopNomination` performs three actions into a single batch: `chill` (remove all nominated validators), `unbond` and sets the payee to `Stash` if it was compounding. But it's also smart about it: only performs the transactions that are needed based on the current account's state.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
//---cut---
const unwind = await stakingSdk.stopNomination("1zugcUbZDfeG...")
// @noErrors: 2304
await unwind.signAndSubmit(signer)
```

## Account Status

`getAccountStatus$` surfaces an observable that combines balance data, staking ledger info, and nomination pool membership.

First of all, it exposes a normalized account balance that is easier to consume:

```ts
interface Balance {
  // Original on-chain info
  raw: {
    free: bigint
    reserved: bigint
    frozen: bigint
    // Added for convenience; set to 0 when the account does not exist.
    existentialDeposit: bigint
  }
  // Total tokens in the account
  total: bigint
  // Portion of `total` balance that is somehow locked (overlapping reserved, frozen, and existential deposit)
  locked: bigint
  // Portion of `free` balance that can't be transferred.
  untouchable: bigint
  // Portion of `free` balance that can be transferred.
  spendable: bigint
}
```

Then for nomination status it has an interface which shows whether it's currently nominating, unlocks, and other various information:

```ts
interface Nomination {
  // Nomination parameters
  nominating: {
    validators: SS58String[]
  } | null
  controller: SS58String | null
  payee: StakingRewardDestination | null
  // Nomination status
  currentBond: bigint
  totalLocked: bigint
  maxBond: bigint
  canNominate: boolean
  unlocks: Array<{
    value: bigint
    era: number
  }>
  // Contextual information
  minNominationBond: bigint
  lastMinRewardingBond: bigint
}
```

Finally, `nominationPool` summarises pool membership, including the pool ID (if any), bonded amount, pending rewards, and unlock schedule:

```ts
interface NominationPool {
  pool: number | null
  currentBond: bigint
  points: bigint
  pendingRewards: bigint
  unlocks: Array<{
    value: bigint
    era: number
  }>
}
```

As a small example:

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
// ---cut---
import { filter, map } from "rxjs"

const subscription = stakingSdk
  .getAccountStatus$("1zugcUbZDfeG...")
  .pipe(
    filter(({ balance }) => balance.locked > 0n),
    map(({ balance, nomination }) => ({
      spendable: balance.spendable,
      currentBond: nomination.currentBond,
    })),
  )
  .subscribe((status) => console.log("Updated status", status))

// Later, when done
subscription.unsubscribe()
```

## Nomination Pools

### `getNominationPools`

List the current nomination pools with `getNominationPools`. Each entry contains addresses, commission policies, active nominations, and state.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
// ---cut---
const pools = await stakingSdk.getNominationPools()
const openPools = pools.filter((pool) => pool.state === "Open")

console.table(
  openPools.map(({ id, name, bond, memberCount, commission }) => ({
    id,
    name,
    members: memberCount,
    totalBond: bond.toString(),
    commission: commission.current * 100,
  })),
)
```

### `getNominationPool$`

You can also subscribe to a single pool using `getNominationPool$`, which keeps track of ledger changes and parameter updates.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
// ---cut---
const pool$ = stakingSdk.getNominationPool$(123)
const poolSub = pool$.subscribe((pool) => console.log("Pool 123 update", pool))

// Later, when done
poolSub.unsubscribe()
```

### `unbondNominationPool`

Unbonding from a nomination pool is not straight-forward, since it deals with `points` instead of tokens.

For this reason, the SDK exports the function `unbondNominationPool`. The helper computes the correct unbonding points and creates the appropriate transaction.

```ts twoslash
// [!include ~/snippets/createStakingSdk.ts]
// ---cut---
const tx = await stakingSdk.unbondNominationPool(
  "1zugcUbZDfeG...",
  10_000_000_000n,
)
// @noErrors: 2304
await tx.signAndSubmit(signer)
```
