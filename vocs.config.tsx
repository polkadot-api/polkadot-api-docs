import { defineConfig } from "vocs";

export default defineConfig({
  title: "Polkadot-API",
  description: "Typescript API to interact with polkadot chains",
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
          text: "Papee",
          link: "/api/papee",
        },
      ],
    },
    {
      text: "Examples",
      collapsed: true,
      items: [
        {
          text: "Example",
          link: "/api/example",
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
