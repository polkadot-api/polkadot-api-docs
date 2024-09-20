export const networks = {
  polkadot: "Polkadot",
  polkadot_asset_hub: "Polkadot Asset Hub",
  polkadot_bridge_hub: "Polkadot Brigde Hub",
  polkadot_collectives: "Polkadot Collectives",
  polkadot_people: "Polkadot People",
  ksmcc3: "Kusama",
  ksmcc3_asset_hub: "Kusama Asset Hub",
  ksmcc3_bridge_hub: "Kusama Brigde Hub",
  ksmcc3_people: "Kusama People",
  ksmcc3_encointer: "Encointer",
  paseo: "Paseo",
  paseo_asset_hub: "Paseo Asset Hub",
  westend2: "Westend",
  westend2_asset_hub: "Westend Asset Hub",
  westend2_bridge_hub: "Westend Brigde Hub",
  westend2_collectives: "Westend Collectives",
  westend2_people: "Westend People",
} as const

type Network = keyof typeof networks

export const sections: { text: string; items: Network[] }[] = [
  {
    text: "Polkadot and parachains",
    items: [
      "polkadot",
      "polkadot_asset_hub",
      "polkadot_bridge_hub",
      "polkadot_collectives",
      "polkadot_people",
    ],
  },
  {
    text: "Kusama and parachains",
    items: [
      "ksmcc3",
      "ksmcc3_asset_hub",
      "ksmcc3_bridge_hub",
      "ksmcc3_people",
      "ksmcc3_encointer",
    ],
  },
  {
    text: "Paseo and parachains",
    items: ["paseo", "paseo_asset_hub"],
  },
  {
    text: "Westend and parachains",
    items: [
      "westend2",
      "westend2_asset_hub",
      "westend2_bridge_hub",
      "westend2_collectives",
      "westend2_people",
    ],
  },
]
