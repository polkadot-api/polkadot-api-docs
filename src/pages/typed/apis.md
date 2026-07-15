# Runtime APIs

Runtime APIs (aka Runtime calls in other frameworks) directly query the wasm runtime to get some information. In PAPI they're under `typedApi.apis`. Let's see its interface:

```ts
type CallOptions = Partial<{
  at: string
  signal: AbortSignal
}>
interface RuntimeCall<Args, Payload> {
  (...args: [...Args, options?: CallOptions]): Promise<Payload>
}
```

They're fairly straight-forward, let's see it with some examples:

With `callOptions.at` we can control which block to query. It can be a blockHash, `"finalized"` (the default), or `"best"`

```ts
// there are some APIs that do not take arguments!
const metadata = await typedApi.apis.Metadata.metadata()

// we can pass as well callOptions
const metadataAtBest = await typedApi.apis.Metadata.metadata({ at: "best" })

// this one takes a number as argument
const metadataV15 = await typedApi.apis.Metadata.metadata_at_version(15, {
  at: "best",
})
```
