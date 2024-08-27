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
      link: "/providers",
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
      ],
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
          link: "https://polkadot-fellows.github.io/dashboard/",
        },        
        {
          text: "Delegit.xyz",
          link: "https://delegit.xyz/",
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
