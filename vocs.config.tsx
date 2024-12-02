import { defineConfig } from "vocs"

export default defineConfig({
  title: "Polkadot-API",
  description: "Typescript API to interact with polkadot chains",
  topNav: [
    {
      text: "Guide",
      link: "/getting-started",
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
          text: "Prepare for runtime upgrade",
          link: "/recipes/upgrade",
        },
        {
          text: "Make a simple transfer",
          link: "/recipes/simple-transfer",
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
          items: [
            {
              text: "API",
              link: "/typed",
            },
            {
              text: "Constants",
              link: "/typed/constants",
            },
            {
              text: "Runtime APIs",
              link: "/typed/apis",
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
        {
          text: "Ink!",
          link: "/ink",
        },
      ],
    },
    {
      text: "Chain-specific documentation",
      link: "https://chains.papi.how",
    },
    {
      text: "Built with PAPI",
      items: [
        {
          text: "Teleport across chains",
          link: "https://github.com/polkadot-api/react-teleport-example",
        },
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
