import fs from "fs"
import path from "path"

import { networks } from "./networks"

/**
 * The purpose of this is to get around client-side router:
 * https://github.com/wevm/vocs/issues/210
 * we're creating a vocs page for each network that's just reloading the page
 */

const FAKE_CHAINS_DOCS_DIR = path.join(process.cwd(), "docs", "pages", "chains")

fs.mkdirSync(FAKE_CHAINS_DOCS_DIR, { recursive: true })
for (const network of Object.keys(networks)) {
  fs.writeFileSync(
    path.join(FAKE_CHAINS_DOCS_DIR, `${network}.mdx`),
    `import Reload from "../../components/Reload"

<Reload />
`,
  )
}
