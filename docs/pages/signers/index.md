# Polkadot Signer

Polkadot-API uses a library-agnostic interface to interact with signers.

## Signers

There are different types of signers, and PAPI has the following signers implemented in the top-level library:

- [Extension-based Signers](/signers/extensions), supporting browser extension wallets (e.g. Talisman, Polkadot.JS, SubWallet).
- [Raw Signers](/signers/raw), a low-level helper to craft your own signers.

## `PolkadotSigner` Interface

The `PolkadotSigner` interface (implemented by our signers) is library-agnostic, and can be implemented and used outside PAPI. [Check the documentation about it](/signers/polkadot-signer).

## Signer Integrations

Looking for a simple way to integrate with different signers? Check out the following community projects:

- [PolkaHub](https://github.com/polkadot-api/polkahub)
- [DOTConnect](https://github.com/buffed-labs/dot-connect): Wallet integration with ReactiveDOT
