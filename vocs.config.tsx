import { defineConfig } from "vocs"

export default defineConfig({
  title: "Polkadot-API",
  description: "Typescript API to interact with polkadot chains",
  basePath: "/polkadot-api-docs",
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
      text: "Examples",
      items: [
        {
          text: "Teleport across chains",
          link: "https://github.com/polkadot-api/react-teleport-example",
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
