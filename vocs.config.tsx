import { defineConfig } from "vocs"

const version = "1.15.0"

export default defineConfig({
  title: "Polkadot-API",
  description: "Typescript API to interact with polkadot chains",
  iconUrl: "/favicon.svg",
  topNav: [
    {
      text: "Guide",
      link: "/getting-started",
    },
    {
      text: `${version}`,
      items: [
        {
          text: "Changelog",
          link: `https://github.com/polkadot-api/polkadot-api/releases/tag/polkadot-api${encodeURIComponent("@")}${version}`,
        },
      ],
    },
  ],
  sidebar: [
    {
      text: "Getting Started",
      link: "/getting-started",
    },
    {
      text: "Requirements",
      link: "/requirements",
    },
    {
      text: "Providers",
      items: [
        { text: "Providers", link: "/providers" },
        { text: "WebSocket", link: "/providers/ws" },
        { text: "Smoldot", link: "/providers/sm" },
      ],
    },
    {
      text: "Codegen",
      link: "/codegen",
    },
    {
      text: "Types",
      link: "/types",
    },
    {
      text: "Signers",
      link: "/signers",
    },
    {
      text: "Recipes",
      items: [
        {
          text: "Make a simple transfer",
          link: "/recipes/simple-transfer",
        },
        {
          text: "Connect to multiple chains",
          link: "/recipes/connect-to-multiple-chains",
        },
        {
          text: "Prepare for runtime upgrade",
          link: "/recipes/upgrade",
        },
        {
          text: "Caching the metadata",
          link: "/recipes/metadata-caching",
        },
      ],
    },
    {
      text: "Top-level client",
      items: [
        {
          text: "PolkadotClient",
          link: "/client",
        },
        {
          text: "Typed API",
          link: "/typed",
          items: [
            {
              text: "Constants",
              link: "/typed/constants",
            },
            {
              text: "Runtime APIs",
              link: "/typed/apis",
            },
            {
              text: "View Functions",
              link: "/typed/view",
            },
            {
              text: "Storage queries",
              link: "/typed/queries",
            },
            {
              text: "Events",
              link: "/typed/events",
            },
            {
              text: "Transactions",
              link: "/typed/tx",
            },
          ],
        },
        {
          text: "Unsafe API",
          link: "/unsafe",
        },
      ],
    },
    {
      text: "Ink!",
      link: "/ink",
    },
    {
      text: "Offline API",
      link: "/offline",
    },
    {
      text: "Typed Codecs",
      link: "/typed-codecs",
    },
    {
      text: "PAPI SDKs",
      link: "/sdks/intro",
      items: [
        {
          text: "Ink! SDK",
          link: "/sdks/ink-sdk",
        },
        {
          text: "Governance SDK",
          items: [
            {
              text: "Referenda",
              link: "/sdks/governance/referenda",
            },
            {
              text: "Bounties",
              link: "/sdks/governance/bounties",
            },
            {
              text: "Conviction Voting",
              link: "/sdks/governance/voting",
            },
          ],
        },
      ],
    },
    {
      text: "Chain-specific documentation",
      link: "https://chains.papi.how",
    },
    {
      text: "PAPI Apps",
      items: [
        {
          text: "PAPI Console",
          link: "https://github.com/polkadot-api/papi-console",
        },
        {
          text: "Polkadot Bounties",
          link: "https://github.com/polkadot-api/bounties",
        },
        {
          text: "Teleport across chains",
          link: "https://github.com/polkadot-api/react-teleport-example",
        },
      ],
    },
    {
      text: "Built with PAPI",
      items: [
        {
          text: "Kheopswap. Swap portal for AssetHub",
          link: "https://github.com/kheopswap/kheopswap",
        },
        {
          text: "Polkadot Fellowship Dashboard",
          link: "https://github.com/polkadot-fellows/dashboard",
        },
        {
          text: "Delegit.xyz",
          link: "https://github.com/delegit-xyz/dashboard",
        },
        {
          text: "Substrate Kitties",
          link: "https://github.com/shawntabrizi/substratekitties",
        },
        {
          text: "Multix",
          link: "https://github.com/ChainSafe/Multix",
        },
        {
          text: "ParaSpell XCM SDK",
          link: "https://paraspell.xyz/",
        },
        {
          text: "Bounty Manager",
          link: "https://github.com/galaniprojects/Polkadot-Bounty-Manager",
        },
        {
          text: "inkathon",
          link: "https://github.com/scio-labs/inkathon",
        },
      ],
    },
  ],
  socials: [
    {
      icon: "github",
      link: "https://github.com/polkadot-api/polkadot-api",
    },
  ],
})
