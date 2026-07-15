// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages } from 'waku/router'

// prettier-ignore
type Page =
  | { path: '/ai/papi-basics-skill'; render: 'static' }
  | { path: '/client'; render: 'static' }
  | { path: '/codegen'; render: 'static' }
  | { path: '/getting-started'; render: 'static' }
  | { path: '/'; render: 'static' }
  | { path: '/ink'; render: 'static' }
  | { path: '/offline'; render: 'static' }
  | { path: '/providers/enhancers'; render: 'static' }
  | { path: '/providers'; render: 'static' }
  | { path: '/providers/sm'; render: 'static' }
  | { path: '/providers/ws'; render: 'static' }
  | { path: '/recipes/connect-to-multiple-chains'; render: 'static' }
  | { path: '/recipes/metadata-caching'; render: 'static' }
  | { path: '/recipes/simple-transfer'; render: 'static' }
  | { path: '/recipes/upgrade'; render: 'static' }
  | { path: '/requirements'; render: 'static' }
  | { path: '/sdks/accounts/identity'; render: 'static' }
  | { path: '/sdks/accounts/linked-accounts'; render: 'static' }
  | { path: '/sdks/governance/bounties'; render: 'static' }
  | { path: '/sdks/governance/referenda'; render: 'static' }
  | { path: '/sdks/governance/voting'; render: 'static' }
  | { path: '/sdks'; render: 'static' }
  | { path: '/sdks/ink-sdk'; render: 'static' }
  | { path: '/sdks/multisig-sdk'; render: 'static' }
  | { path: '/sdks/staking-sdk'; render: 'static' }
  | { path: '/sdks/statement'; render: 'static' }
  | { path: '/signers/extensions'; render: 'static' }
  | { path: '/signers'; render: 'static' }
  | { path: '/signers/raw'; render: 'static' }
  | { path: '/signers/tx-creator'; render: 'static' }
  | { path: '/static'; render: 'static' }
  | { path: '/typed/apis'; render: 'static' }
  | { path: '/typed/constants'; render: 'static' }
  | { path: '/typed/events'; render: 'static' }
  | { path: '/typed/queries'; render: 'static' }
  | { path: '/typed/tx'; render: 'static' }
  | { path: '/typed/view'; render: 'static' }
  | { path: '/typed-codecs'; render: 'static' }
  | { path: '/typed'; render: 'static' }
  | { path: '/types'; render: 'static' }
  | { path: '/unsafe'; render: 'static' }
  | { path: '/v2migration'; render: 'static' }
  | { path: '/v3migration'; render: 'static' }

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>
  }
  interface CreatePagesConfig {
    pages: Page
  }
}
