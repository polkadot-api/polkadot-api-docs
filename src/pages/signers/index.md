# Signers

Polkadot-API uses an interface called `TxCreator` to create transactions, both for signed and general transactions.

## TxCreator

There are different ways to create transactions, and PAPI has the following integrations implemented in the top-level library:

- [Extension-based TxCreators](/signers/extensions), supporting browser extension wallets (e.g. Talisman, Polkadot.JS, SubWallet).
- [Raw TxCreator](/signers/raw), a low-level helper to create your own TxCreator from a signing function.

The `TxCreator` interface is built so that third parties can implement their own. [Check the documentation about it](/signers/tx-creator).

## Wallet integrations

Looking for a simple way to integrate with different wallets? Check out the following community projects:

- [PolkaHub](https://github.com/polkadot-api/polkahub)
- [DOTConnect](https://github.com/buffed-labs/dot-connect): Wallet integration with ReactiveDOT
