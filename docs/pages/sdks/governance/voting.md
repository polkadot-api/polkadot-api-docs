# Conviction Voting SDK

The Conviction Voting pallet took a few compromises that improved the efficiency of the pallet, at the cost of a harder developer experience. The Conviction Voting SDK simplifies working with on-chain votes:

- Querying and sending votes
- Vote delegations
- Locks

## Getting Started

Install the Governance SDK using your package manager:

```sh
npm i @polkadot-api/sdk-governance
```

Then, initialize it by passing in the `typedApi` for your chain:

```ts
import { createConvictionVotingSdk } from '@polkadot-api/sdk-governance';
import { dot } from '@polkadot-api/descriptors';
import { getSmProvider } from 'polkadot-api/sm-provider';
import { chainSpec } from 'polkadot-api/chains/polkadot';
import { start } from 'polkadot-api/smoldot';
import { createClient } from 'polkadot-api';

const smoldot = start();
const chain = await smoldot.addChain({ chainSpec });

const client = createClient(getSmProvider(chain));
const typedApi = client.getTypedApi(dot);

const votingSdk = createConvictionVotingSdk(typedApi);
```

## Querying votes

Votes are organized by account and by [track](https://wiki.polkadot.network/docs/learn-polkadot-opengov-origins#origins-and-tracks-info). On every track, an account can either vote to multiple referenda, or delegate some voting power to another account.

The entry point of this SDK is `getVotingTrack` to get one specific track or `getVotingTracks` to get all the tracks an account is either voting or delegating.

```ts
interface ConvictionVotingSdk {
  getVotingTracks(account: SS58String): Promise<Array<TrackCasting | TrackDelegating>>
  getVotingTrack(account: SS58String, track: number): Promise<TrackCasting | TrackDelegating>
  // ...
}

interface TrackCasting {
  type: "casting"
  track: number
  delegationPower: DelegationPower

  votes: Vote[]
  // ...
}

interface TrackDelegating {
  type: "delegating"
  track: number
  delegationPower: DelegationPower

  target: SS58String
  balance: bigint
  conviction: VotingConviction

  remove(): Transaction<any, string, string, unknown>
  // ...
}
```

The property `delegationPower` is the delegation power that the account has received from other accounts for this track. Meaning that every vote or delegation on this track will cause all that balance to also vote or delegate in the same direction.

And when casting a vote, there's also 2 types of votes:

- Standard: Voting in one direction, which might have voting conviction.
- Split: Voting a combination of aye, nay and abstain, which doesn't support conviction.

```ts
type Vote = StandardVote | SplitVote
interface StandardVote extends CommonVote {
  type: "standard"
  poll: number
  balance: bigint

  direction: "aye" | "nay" | "abstain"
  conviction: VotingConviction

  remove(): Transaction<any, string, string, unknown>
  // ...
}
interface SplitVote extends CommonVote {
  type: "split"
  poll: number
  balance: bigint

  aye: bigint
  nay: bigint
  abstain: bigint

  remove(): Transaction<any, string, string, unknown>
  // ...
}
```

:::note
Votes with `abstain` also can't have conviction, but to simplify the API they are treated as a `StandardVote`, and they will always have `conviction: VotingConviction.None()`
:::

An example to filter all the votes that have voted `aye` for an account:

```ts
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const allTracks = await votingSdk.getVotingTracks(ALICE);
const allVotes = allTracks.flatMap(track => track.type === "casting" ? track.votes : []);
const ayeVotes = allVotes.filter(vote => vote.type === "standard" && vote.direction === "aye");
```

The SDK also offers an observable-based API with the homologous methods `votingTrack$` and `votingTracks$`, which will update as soon as changes are done to the account or track.

## Sending votes

The transactions from the pallet to create votes require some bit masking to specify the vote. The SDK simplifies voting with the following functions:

```ts
interface ConvictionVotingSdk {
  vote(
    vote: "aye" | "nay",
    poll: number,
    value: bigint,
    conviction?: VotingConviction,
  ): Transaction<any, string, string, unknown>

  voteAbstain(
    poll: number,
    value: bigint,
  ): Transaction<any, string, string, unknown>

  voteSplit(
    poll: number,
    vote: Partial<{
      aye: bigint
      nay: bigint
      abstain: bigint
    }>,
  ): Transaction<any, string, string, unknown>
  // ...
}
```

- `vote` will cast an `aye` or `nay` vote, with an optional conviction (which defaults to None)
- `voteAbstain` is a separate function to vote with `abstain`, as that one doesn't accept vote conviction.
- `voteSplit` can be used to cast a split vote.

## Locks

The balance used by the Conviction Voting pallet becomes frozen while it's being used to vote or delegate, and might get locked for a period of time when removing a vote or delegation based on certain conditions. The locks are also based on track.

To get any existing lock for a track, use the property `lock`:

```ts
const ALICE = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const MEDIUM_SPENDER = 33;
const track = await votingSdk.getVotingTrack(ALICE, MEDIUM_SPENDER);
// { block: number, balance: bigint } | null
console.log(track.lock)
```

If there's a lock in place, `block` tells at which block number it can be unlocked, and balance tells the amount.

### Delegation Locks

Removing a delegation will always lock that balance for some time, based on the selected conviction and the pallet configuration. The `TrackDelegating` type exposes a property `lockDuration` that says, in number of blocks, how long that lock will last:

```ts
if (track.type === "delegating") {
  console.log(`Removing the vote will lock ${track.balance} tokens for ${track.lockDuration} blocks`);
}
```

### Vote Locks

Removing votes will create a lock only if your vote is in the winning side (i.e. the vote is `aye` and the referendum passed, or the vote is `nay` and the referendum was rejected), and it will be based on conviction. If the referendum is still ongoing, no locks will be applied for removing the vote.

Something to keep in mind is that when removing a vote that would create a lock, this will extend the pre-existing lock. For example:

- Starting with someone with no locks for the track.
- A vote is removed that causes a lock of 100 DOT until block 8000.
- The track lock becomes `{ balance: 100, block: 8000 }`.
- A vote is removed that causes a lock of 10 DOT until block 7000.
- The track lock stays `{ balance: 100, block: 8000 }`, because both values are smaller and the new lock can be contained within.
- A vote is removed that causes a lock of 200 DOT until block 7000.
- The track lock becomes `{ balance: 200, block: 8000 }`. Note that even though it was 200 DOT for 7000, now these 200 DOT will be locked until block 8000.
- A vote is removed that causes a lock of 1 DOT until block 10_000.
- The track lock becomes `{ balance: 200, block: 10_000 }`. Note that this has caused the pre-existing lock of 200 DOT to now be extended to block 10_000.

This only happens if the lock caused by the removal of the vote is still relevant, meaning in this example we are before the block 7000. If we have already passed that, then the lock is not created or updated.

The SDK exposes for each vote a method `getLock(outcome)` that will return which scenario will removing a vote cause:

```ts
const track = await votingSdk.getVotingTrack(ALICE, MEDIUM_SPENDER);
if (track.type === "casting") {
  const vote = track.votes[0];
  const lock = vote.getLock({
    // Assuming the poll ended at block 8000 with a result of "aye"
    ended: 8000,
    side: "aye"
  });

  switch (lock.type) {
    case 'free':
      console.log("Removing this vote won't cause any lock");
      break;
    case 'locked':
      console.log(
        `Removing this vote will have ${vote.balance} tokens locked until block ${lock.end}`
      );
      break;
    case 'extends':
      console.log(`Removing this vote will cause the track lock to become extended to ${lock.end}`);
      console.log(
        `We might want to wait until block ${track.lock.block} and call track.unlock() before
         removing this vote.`
      )
      break;
    case 'extended':
      console.log(
        `Removing this vote before ${lock.end} will cause its balance to become extended to the
         track lock ${track.lock.end}`
      );
      console.log(`We might want to wait until block ${lock.end} before removing this vote.`)
      break;
  }
}
```

### Unlock schedule

Based on these lock stacking rules, it's possible to sort the votes to be removed at certain blocks to maximize the amount of tokens freed.

The `TrackCasting` type offers a function to get which votes to unlock to maximise this:

```ts
const track = await votingSdk.getVotingTrack(ALICE, MEDIUM_SPENDER);
if (track.type === "casting") {
  const schedule = track.getUnlockSchedule({
    // poll 1032 ended with "aye" at block 7000
    1032: { side: 'aye', ended: 7000 }
    // poll 1035 hasn't ended yet
    1035: null
  });

  schedule.forEach(action => {
    console.log(`At block ${action.block} you can free up ${action.balance} tokens by performing the following unlocks:`)

    action.unlocks.forEach(unlock => {
      if (unlock.type === "lock") {
        console.log("unlock the track lock: track.unlock()");
      }
      if (unlock.type === "poll") {
        console.log(`remove the vote from poll ${unlock.id}`);
      }
    })
  })
}
```

