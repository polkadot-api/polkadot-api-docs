# Events

Let's, first of all, understand the interface of an `Event` in polkadot-api. This interface will be common for every section after this one. The main idea is to give the developer as much information as possible:

```ts
type EventPhase =
  | { type: "ApplyExtrinsic"; value: number }
  | { type: "Finalization" }
  | { type: "Initialization" }

// Event as defined in the Runtime's storage
type SystemEvent = {
  phase: EventPhase
  event: {
    type: string
    value: {
      type: string
      value: any
    }
  }
  topics: Array<SizedHex<32>>
}

// Event received from the TypedAPI's functions
// The payload is the typed inner value of the SystemEvent (decreases verbosity)
type PalletEvent<T> = {
  original: SystemEvent
  payload: T
}
```

As seen in previous sections, we can access each event by `typedApi.event.<pallet>.<event>`. For example, we could have `typedApi.event.Balances.Burned` or `typedApi.event.Proxy.PureCreated` as examples. Every event has the following EvClient interface:

```ts
type EvClient<T> = {
  get: (blockHash: HexString) => Promise<Array<PalletEvent<T>>>
  watch: () => Observable<{
    block: BlockInfo
    events: PalletEvent<T>[]
  }>
  watchBest: () => Observable<{
    type: "new" | "drop" | "finalized"
    block: BlockInfo
    events: PalletEvent<T>[]
  }>
  filter: (collection: SystemEvent[]) => Array<PalletEvent<T>>
}
```

## Get

This is the simpler method. It'll allow us to fetch (Promise-based) all events (matching the event kind chosen) available for a given block. Let's see its interface and an example:

```ts
function get(blockHash: HexString): Promise<Array<PalletEvent<T>>>

const block = await client.getFinalizedBlock()
// this is an array of `Balances.Burned` events
const burnedEvents = await typedApi.event.Balances.Burned.get(block.hash)
```

## Watch

This method is similar to the previous one, but `Observable`-based. It'll allow us to subscribe to events (matching the event kind chosen) available on every `finalized` block. This observable is multicast (multiple subscriptions will share the execution and results) and stateful (once subscribing you'll get the latest state available). This subscription will never complete since events will be emitted every time a new block is finalized. Note that the events will come in order of block number. Let's see the interface and an example:

It emits once per finalized block, even if that block has no matching events. In that case, `events` will be an empty array.

```ts
function watch(): Observable<{
  block: BlockInfo
  events: PalletEvent<T>[]
}>

// we console.log the first 5 blocks and complete
typedApi.event.Balances.Burned.watch().pipe(take(5)).forEach(console.log)
```

## Watch best

`watchBest` is similar to `watch`, but it follows the current best-block chain instead of only finalized blocks. This means it can also report reorgs. Each emission includes the block and the typed events found in that block, plus a `type` describing what happened:

- `new`: a block was added to the current best chain.
- `drop`: a previously seen best block was removed from the best chain after a reorg.
- `finalized`: a previously seen best block became finalized.

For `new` blocks, events are emitted in increasing block number. For `drop` blocks, they are emitted in reverse block number, so the newest dropped block is emitted first.

It emits notifications for every block, even if that block has no matching events. In that case, `events` will be an empty array.

```ts
function watchBest(): Observable<{
  type: "new" | "drop" | "finalized"
  block: BlockInfo
  events: PalletEvent<T>[]
}>

typedApi.event.Balances.Burned.watchBest().subscribe((event) => {
  switch (event.type) {
    case "new":
      console.log("Best block", event.block.number, event.events)
      break
    case "drop":
      console.log("Reorg dropped block", event.block.number)
      break
    case "finalized":
      console.log("Finalized block", event.block.number)
      break
  }
})
```

## Filter

Filter hits the nail when you have a bunch of `SystemEvents` (i.e. events got from finalized transactions, from a block using `bestBlock$` observable, etc) and you want to get only a particular event kind from them all. Let's see the interface, and an example:

```ts
function filter(collection: SystemEvent[]): Array<PalletEvent<T>>

// we get the finalized tx
const finalizedTx = await typedApi.tx.Balances.transfer_keep_alive({
  dest: addr,
  value: 10n ** 10n,
}).signAndSubmit(signer)

// it's synchronous!
// we have here the typed payload of the events
const filteredEvents = typedApi.event.Balances.Transfer.filter(
  finalizedTx.events,
)
```
