# Polkadot-API SDKs

The Polkadot-API library is designed to be modular and chain-agnostic, meaning it does not include any business-level logic. It reads the chain metadata to understand how to interact with the chain, but it is up to the developer to define its specific use and purpose.

With its modular design philosophy, Polkadot-API enables the creation of additional libraries that add new layers of abstraction, significantly enhancing the developer experience when building dApps. These additional libraries are referred to as "Polkadot-API SDKs."

These SDKs abstract implementation details from the pallets, elevating chain interactions to a higher level of abstraction. They handle complexities such as transaction weight calculation, associated fees, and determining the best transaction (or set of transactions) for performing specific actions.

We have created several SDKs, documented in the following sections, to simplify common interactions when working with Substrate-based chains. These SDKs not only streamline development but can also serve as examples for anyone interested in creating their own SDKs.
