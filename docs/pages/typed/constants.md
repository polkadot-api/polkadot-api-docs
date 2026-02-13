# Constants

Constants are the simplest structure that we find inside the `TypedApi`. Constants are hard-coded key-value pairs that are embedded in the runtime metadata. In PAPI their structure is just a simple function that return its decoded value.

Let's use `typedApi.constants.System.Version`. See in this example how it's used:

```ts
const version = await typedApi.constants.System.Version()
```
