// [!region import]
// `dot` is the name we gave to `npx papi add`
import { dot } from "papee/descriptors";
import { createClient } from "papee";
// [!endregion import]

// [!region usage]
// With the `client`, you can get information such as subscribing to the last
// block to get the latest hash:
client.finalized$.subscribe((finalizedBlock) =>
  console.log(finalizedBlock.number, finalizedBlock.hash)
);

// To interact with the chain, you need to get the `TypedApi`, which includes
// all the types for every call in that chain:
const dotApi = client.getTypedApi(dot);

// get the value for an account
const accountInfo = await dotApi.query.System.Account.getValue(
  "16JGzEsi8gcySKjpmxHVrkLTHdFHodRepEz8n244gNZpr9J"
);
// [!endregion usage]
