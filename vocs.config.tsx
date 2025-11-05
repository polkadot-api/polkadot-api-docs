import { defineConfig } from "vocs"

const version = "1.20.0"

export default defineConfig({
  title: "Polkadot-API",
  titleTemplate: "%s · PAPI",
  description: "Next-Gen TS API to interact with Polkadot-based chains",
  iconUrl: "/favicon.svg",
  theme: {
    accentColor: {
      dark: "#ff2f92",
      light: "#e7007b",
    },
  },
  editLink: {
    pattern:
      "https://github.com/polkadot-api/polkadot-api-docs/edit/main/docs/pages/:path",
    text: "Suggest changes to this page",
  },
  head() {
    return (
      <script
        src="https://cdn.usefathom.com/script.js"
        data-site="DTWNOCOD"
        defer
      />
    )
  },
  topNav: [
    {
      text: "Docs",
      link: "/getting-started",
      match: "/",
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
      text: "Introduction",
      items: [
        {
          text: "Getting Started",
          link: "/getting-started",
        },
        {
          text: "Requirements and Compatibility",
          link: "/requirements",
        },
        {
          text: "CLI & Codegen",
          link: "/codegen",
        },
        {
          text: "Types",
          link: "/types",
        },
      ],
    },
    {
      text: "Providers",
      collapsed: true,
      items: [
        { text: "Introduction", link: "/providers" },
        { text: "Smoldot", link: "/providers/sm" },
        { text: "WebSocket", link: "/providers/ws" },
        { text: "Enhancers", link: "/providers/enhancers" },
        { text: "JSON-RPC Provider", link: "/providers/json-rpc" },
      ],
    },
    {
      text: "Signers",
      collapsed: true,
      items: [
        { text: "Introduction", link: "/signers" },
        { text: "Browser extensions", link: "/signers/extensions" },
        { text: "Raw signers", link: "/signers/raw" },
        { text: "PolkadotSigner", link: "/signers/polkadot-signer" },
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
      text: "Chain-specific documentation",
      link: "https://chains.papi.how",
    },
    {
      text: "Recipes",
      collapsed: true,
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
      text: "PAPI SDKs",
      collapsed: true,
      items: [
        {
          text: "Introduction",
          link: "/sdks",
        },
        {
          text: "Ink! SDK",
          link: "/sdks/ink-sdk",
        },
        {
          text: "Accounts SDK",
          items: [
            {
              text: "Identity",
              link: "/sdks/accounts/identity",
            },
            {
              text: "Linked Accounts",
              link: "/sdks/accounts/linked-accounts",
            },
          ],
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
        {
          text: "Multisig SDK",
          link: "/sdks/multisig-sdk",
        },
      ],
    },
    {
      text: "PAPI Apps",
      collapsed: true,
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
          text: "Diff runtimes",
          link: "https://github.com/polkadot-api/polka-diff",
        },
        {
          text: "Multisig tool",
          link: "https://github.com/polkadot-api/multisig-tool",
        },
        {
          text: "Teleport across chains",
          link: "https://github.com/polkadot-api/react-teleport-example",
        },
        {
          text: "Scale tool",
          link: "https://github.com/polkadot-api/scale-tool",
        },
      ],
    },
    {
      text: "Built with PAPI",
      collapsed: true,
      items: [
        {
          text: "Kheopswap. Swap portal for AssetHub",
          link: "https://github.com/kheopswap/kheopswap",
        },
        {
          text: "Multix",
          link: "https://github.com/ChainSafe/Multix",
        },
        {
          text: "ParaSpell XCM SDK",
          link: "https://github.com/paraspell/xcm-tools/",
        },
        {
          text: "Inkathon",
          link: "https://github.com/scio-labs/inkathon",
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
          text: "Bounty Manager",
          link: "https://github.com/galaniprojects/Polkadot-Bounty-Manager",
        },
        {
          text: "ReactiveDOT",
          link: "https://reactivedot.dev",
        },
        {
          text: "DOTConnect",
          link: "https://dotconnect.dev",
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
