# Requirements

PAPI is designed to work flawlessly with almost any Polkadot-like chain. Even though, we have some requirements that the chain and environment have to fulfill.

## Environment

PAPI supports all modern browsers (e.g. Chrome, Firefox, Safari...), besides Node JS, Bun, etc.

Some environments have particularities:

### NodeJS

PAPI is developed using the latest NodeJS LTS (currently `22.x`). The minimum required version is `20.19.0`.

We recommend using the latest NodeJS LTS.

### Bun

In case you are using `bun` as your Javascript runtime, then Papi will work flawlessly with it! Make sure to use a fairly recent version.

## Typescript

In order for PAPI to be imported correctly, and get all the types, the minimum working version of `typescript` is `5.2`.

PAPI is always developed using the latest `typescript` stable version.

## Chain

### Runtime

The most important thing to take into account is that the runtime needs to have a Runtime Metadata version `>=14`. We don't support any chain below that.

Besides that, Polkadot-API requires runtimes to implement some basic runtime calls. They are generally implemented in all chains developed using FRAME:

- In order to get the metadata, it needs `Metadata_metadata_versions` and `Metadata_metadata_at_version`. If they are not present, then `Metadata_metadata` needs to be there and answer a `v14` Metadata.
- To create and broadcast transactions, Polkadot-API needs `AccountNonceApi_account_nonce` and `TaggedTransactionQueue_validate_transaction`. To estimate the fees, it also requires `TransactionPaymentApi_query_info`.

In order to create transactions as well, the following constant is required:

- `System.Version`, having `spec_version` and `transaction_version` fields.
