# Offline API

The rationale behind the offline api is to allow consumers to do certain actions with PAPI without the need of a provider. As expected, this client is more limited than the regular [`PolkadotClient`](/client).

Let's see an example first of all:

```typescript
import { getOfflineApi } from "polkadot-api"
import { dotDescriptors } from "@polkadot-api/descriptors" // you'll need them!

const offline = await getOfflineApi(dotDescriptors) // it is async!

// metadata constants can be easily accessed
const prefix = api.constants.System.SS58Prefix // directly the value; e.g. `0`
const { spec_name, spec_version } = api.constants.System.Version

// transactions can be created and signed
const tx = api.tx.Balances.transfer_keep_alive({
  dest: MultiAddress.Id(myAddr),
  value: amount,
})

tx.encodedData // we have the encoded callData
tx.decodedCall // and the decodedCall

const tx2 = offline.tx.Utility.batch({
  calls: [
    offline.tx.System.remark({ remark: Binary.fromText("HELLO!") }).decodedCall,
    tx.decodedCall,
  ],
})

// we can sign txs, but we need to add more stuff than usual!
const signedTx = await tx2.sign(signer, {
  nonce: 24, // nonce is always compulsory
  mortality: { mortal: false }, // and mortality!
})
```

## Constants

Constants can be accessed easily having the metadata. `api.constants.Pallet.Entry` already gives the decoded value.

## Transactions

This is the main usecase of offline api. It allows to create and encode transactions, and even sign them.
The transactions are created in the exact same way as in the regular API ([see docs](/typed/tx)). Nevertheless, only a subset of the fields are exposed:

- `decodedCall`: it enables to get the _PAPI decoded_ transaction. It is helpful to create other txs that require them as a parameter (e.g. `Utility.batch`).
- `encodedData`: a `Binary` with the encoded call data.
- `sign`: it takes the same arguments as the regular API, but there are two compulsory signed extensions:
  - `nonce`: nonce cannot be retrieved anymore from the chain, and therefore has to be passed
  - `mortality`: transactions can be signed either mortal or immortal. In case the tx were to be mortal, the block information has to be passed as well.
  ```typescript
  type Mortality =
    | { mortal: false }
    | {
        mortal: true
        period: number
        startAtBlock: { height: number; hash: HexString }
      }
  ```
