import { defineConfig } from "vocs";

export default defineConfig({
  title: "Polkadot-API",
  description: "Typescript API to interact with polkadot chains",
  basePath: "/polkadot-api-docs",
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
      text: "API",
      collapsed: true,
      items: [
        {
          text: "Polkadot-API",
          link: "/api/polkadot_api",
        },
      ],
    },
    {
      text: "Examples",
      collapsed: true,
      items: [
        {
          text: "Example",
          link: "/examples/example",
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
});
