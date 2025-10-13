# `PolkadotSigner`

`PolkadotSigner` is the inteface required by any method inside `polkadot-api` that requires a signer. It has the following fields:

## `publicKey`

`Uint8Array`

This is the key the chain uses to identify the signer. For `AccountId32` (i.e. regular Polkadot addresses) it is the public key, and for `AccountId20` it is the H160 Ethereum-like address.

## `signTx`

This is a function used to invoke a transaction signature.

### Returns

`Promise<Uint8Array>`

An extrinsic ready to broadcast.

### Parameters

#### `callData`

`Uint8Array`

SCALE-encoded call data of the extrinsic, as described in the metadata.

#### `signedExtensions`

```ts
type SignedExtensions = Record<
  string,
  { identifier: string; value: Uint8Array; additionalSigned: Uint8Array }
>
```

Record of extensions given to the signer to be signed.

- Record's keys are extensions identifier, as described in the Metadata.
- Value:
  - `identifier`: Signed extensions identifier, as described in the Metadata.
  - `value`: SCALE-encoded _explicit_ part of the extension, also known as _extra_.
  - `additionalSigned`: SCALE-encoded _implicit_ part of the extension, also known as _additional signed_.

:::note
This interface does not define if all extensions present in the metadata have to be passed to the signer.

If only a subset of them is passed, the signer may throw an error.
:::

#### `metadata`

`Uint8Array`

SCALE-encoded Metadata of the chain in which the transaction is being signed. It should include the metadata magic number and the version byte, following [`RuntimeMetadataPrefixed`](https://github.com/paritytech/frame-metadata/blob/f3338dc3a101fc276dac2bc0f567c8cdf85a85ce/frame-metadata/src/lib.rs#L89) encoding.

It may (or not) be prepended with the compact-encoded length (i.e. opaque).

#### `atBlockNumber`

`number`

Block number used to create the transaction mortality.

#### `hasher`

`(data: Uint8Array) => Uint8Array`

Hasher function of the chain. It is optional, letting the signer infer it.

## `signBytes`

`(data: Uint8Array) => Promise<Uint8Array>`

Returns a signature of the provided payload.

:::note
The signer may enforce certain restrictions to ensure that raw bytes passed do not constitute, for instance, a valid extrinsic.
:::

## Interface

```ts
interface PolkadotSigner {
  publicKey: Uint8Array
  /**
   * Signs a transaction (extrinsic) for broadcasting.
   *
   * @param callData          The call data of the transaction (without the
   *                          compact length prefix).
   * @param signedExtensions  Extensions that should be signed along with the
   *                          extrinsic.
   *                          The record's `key` represents the identifier,
   *                          which is included both as the `key` and within
   *                          the value for convenience. The `value`
   *                          represents the `extra` portion, which is
   *                          included in the extrinsic itself, while
   *                          `additionalSigned` is the part that is signed
   *                          but not included in the extrinsic.
   * @param metadata          The metadata in SCALE-encoded format. This can
   *                          either be in `Opaque` form or just the raw
   *                          metadata, starting with the appropriate
   *                          metadata magic number and metadata version.
   * @param atBlockNumber     The block number at which the transaction has
   *                          been created.
   * @param hasher            An optional hashing function to build the
   *                          extrinsic with. Defaults to `Blake2b` with a
   *                          256-bit hash length.
   * @returns A signed extrinsic ready to be broadcasted.
   */
  signTx: (
    callData: Uint8Array,
    signedExtensions: Record<
      string,
      {
        identifier: string
        value: Uint8Array
        additionalSigned: Uint8Array
      }
    >,
    metadata: Uint8Array,
    atBlockNumber: number,
    hasher?: (data: Uint8Array) => Uint8Array,
  ) => Promise<Uint8Array>
  /**
   * Signs an arbitrary payload.
   *
   * The signer may enforce certain restrictions to ensure that raw bytes passed
   * do not constitute, for instance, a valid extrinsic.
   *
   * @param data  The payload to be signed.
   * @returns A raw cryptographic signature.
   */
  signBytes: (data: Uint8Array) => Promise<Uint8Array>
}
```
