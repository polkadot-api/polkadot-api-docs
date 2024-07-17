# Events

Let's, first of all, understand the interface of an `Event` in polkadot-api. This interface will be common for every section after this one. The main idea is to give the developer as much information as possible:

```ts
type BlockInfo = {
  hash: string
  number: number
  parent: string
}

type EventPhase =
  | { type: "ApplyExtrinsic"; value: number }
  | { type: "Finalization" }
  | { type: "Initialization" }

type Event<T> = {
  meta: {
    block: BlockInfo
    phase: EventPhase
  }
  payload: T
}
```

As one could notice, the structure directly comes from how events are shaped in Substrate. Fairly straight-forward, the `phase` comes directly from the structure of events in the node, `blockInfo` holds the information about the block in which the event is found, and the `payload` depends on which kind of event we're querying. Let's see the three methods:

As seen in previous sections, we can access each event by `typedApi.event.<pallet>.<event>`. For example, we could have `typedApi.event.Balances.Burned` or `typedApi.event.Proxy.PureCreated` as examples. Every event has the following EvClient interface:

```ts
type EvClient<T> = {
  pull: EvPull<T>
  watch: EvWatch<T>
  filter: EvFilter<T>
  getCompatibilityLevel: GetCompatibilityLevel
}
```

We already learnt about `getCompatibilityLevel`, let's see step by step the other methods:

## Pull

This is the simpler method. It'll allow us to fetch (Promise-based) all events (matching the event kind chosen) available in the latest known `finalized` block. Let's see its interface and an example:

```ts
type EvPull<T> = () => Promise<Array<Event<T>>>

// this is an array of `Balances.Burned` events
const burnedEvents = await typedApi.events.Balances.Burned.pull()
```

## Watch

This method is similar to the previous one, but `Observable`-based. It'll allow us to subscribe to events (matching the event kind chosen) available on every `finalized` block. This observable is multicast (multiple subscriptions will share the execution and results) and stateful (once subscribing you'll get the latest state available). This subscription will never complete since events will be emitted every time a new block is finalized. Note that the events will come in order of block number. Let's see the interface and an example:

```ts
export type EvWatch<T> = (
  filter?: (value: T) => boolean,
) => Observable<Event<T>>

// note that we can add a filter function, for example we only want burned
// events with over 1 DOT in amount
// we console.log the first 5 blocks and complete
typedApi.event.Balances.Burned.watch(({ amount }) => amount > 10n ** 10n)
  .pipe(take(5))
  .forEach(console.log)
```

## Filter

Filter hits the nail when you have a bunch of `SystemEvents` (i.e. events got from finalized transactions, from a block using `bestBlock$` observable, etc) and you want to get only a particular event kind from them all. Compared to the other two methods, you just get the `payload` in this case, because there's no context around where you got this events from. Let's see the interface, and an example:

```ts
type EvFilter<T> = (collection: SystemEvent["event"][]) => Array<T>

// we get the finalized tx
const finalizedTx = await typedApi.tx.Balances.transfer_keep_alive({
  dest: addr,
  value: 10n ** 10n,
}).signAndSubmit(signer)

// it's synchronous!
// we have here the typed payload of the events
const filteredEvents = typedApi.events.Balances.Transfer.filter(
  finalizedTx.events,
)
```
