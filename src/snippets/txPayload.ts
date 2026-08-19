type TxPayloadV1 = {
  version: 1
  signer: string | null
  callData: string
  extensions: Array<{
    id: string
    extra: string
    additionalSigned: string
  }>
  txExtVersion: number | null
  context: {
    metadata: string
    token: {
      symbol: string
      decimals: number
    } | null
    bestBlockHeight: number
    bestBlockHash: string
    genesisHash: string
  }
}

// [!region txArgSpec]
interface TxArgSpec {
  chain: TxChainDefinition
  id: string
  params: object
}

interface TxChainDefinition {
  extensions: Record<
    string,
    {
      value?: unknown
      additionalSigned?: unknown
    }
  >
}
// [!endregion txArgSpec]
