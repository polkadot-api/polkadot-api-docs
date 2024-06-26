# TypedApi

The `TypedApi` allows to interact with the runtime metadata easily and with a great developer experience. It'll allow to make storage calls, create transactions, etc. It uses the descriptors generated by PAPI CLI (see [Codegen](/codegen) section for a deeper explanation) to generate the types used at devel time. `TypedApi` object looks like:

```ts
type TypedApi = {
  query: StorageApi
  tx: TxApi
  event: EvApi
  apis: RuntimeCallsApi
  constants: ConstApi
  runtime: RuntimeApi
}
```

Let's start with the simplest one, `runtime` field. It's just:

```ts
type RuntimeApi = Observable<Runtime> & {
  latest: () => Promise<Runtime>
}
```

It's an observable that holds the current runtime information for that specific client, with a `latest` function to be able to wait for the runtime to load (it'll be helpful for some functions that need a `Runtime`, see [this recipe](/recipes/upgrade)).

All the other fields are a `Record<string, Record<string, ???>>`. The first index defines the pallet that we're looking for, and the second one defines which query/tx/event/api/constant are we looking for inside that pallet. Let's see, one by one, what do we find inside of it!

## isCompatible

First of all, let's understand `isCompatible` field. It's under each query/tx/event/api/constant in any runtime. After generating the descriptors (see [Codegen](/codegen) section), we have a typed interface to every interaction with the chain. Nevertheless, breaking runtime upgrades might hit the runtime between developing and the runtime execution of your app. `isCompatible` enables you to check on runtime if there was a breaking upgrade that hit your particular method.

Let's see its interface, and an example.

```ts
interface IsCompatible {
  (): Promise<boolean>
  (runtime: Runtime): boolean
}
```

For example, let's use `typedApi.query.System.Number`. It's a simple query, we'll see in the next pages how to interact with it. We're only interested on `isCompatible`.

```ts
const query = typedApi.query.System.Number
const runtime = await typedApi.runtime.latest() // we already learnt about it!

// in this case `isCompatible` returns a Promise<boolean>
if (await query.isCompatible()) {
  // do your stuff, the query is compatible
} else {
  // the call is not compatible!
  // keep an eye on what you do
}

// another option would be to use the already loaded runtime
// in this case, `isCompatible` is sync, and returns a boolean
if (query.isCompatible(runtime)) {
  // do your stuff, the query is compatible
} else {
  // the call is not compatible!
  // keep an eye on what you do
}
```

As you can see, `isCompatible` is really powerful since we can prepare for runtime upgrades seamlessly using PAPI. See [this recipe](/recipes/upgrade) for an example!

Let's continue with the rest of the fields!
