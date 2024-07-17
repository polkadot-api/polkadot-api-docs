# Constants

Constants are the simplest structure that we find inside the `TypedApi`. Constants are hard-coded key-value pairs that are embedded in the runtime metadata. In PAPI their structure is just a simple function that return its decoded value, with two alternatives. As explained in [the previous section](/typed#getcompatibilitylevel) for `getCompatibility Level`, we have two options to get the value:

- Promise-based call, without passing the runtime
- Synchronous return, passing the runtime previously awaited for

Let's use `typedApi.constants.System.Version`. See in this example how it's used:

```ts
// in this case the function is asynchronous
const versionAsync = await typedApi.constants.System.Version()

const runtime = await typedApi.runtime.latest() // we already learnt about it!
// in this case it's sync
const versionSync = typedApi.constants.System.Version(runtime)
```
