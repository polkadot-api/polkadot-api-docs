import cp from "child_process"
import fs from "fs"
import path from "path"

import { networks } from "./networks"

/*
  in process.env.NODE_ENV === "development", this script generates docs
  in "./chain_docs/dist", which is served by a separate server

  in process.env.NODE_ENV === "production", this script overwrites
  "./docs/dist/chain_docs, expecting vocs generation to be executed prior
 */

const CHAIN_DOCS_DIST =
  process.env.NODE_ENV === "development"
    ? path.join(process.cwd(), "chain_docs", "dist")
    : path.join(process.cwd(), "docs", "dist", "chains")

const spawnAndWait = (cmd: string, args: string[]): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = cp.spawn(cmd, args, { stdio: "inherit", shell: true })
    proc.on("exit", (code, signal) => {
      if (code === 0) resolve()
      else
        reject(
          `Process ${cmd} ${args} ` + signal === null
            ? `exited with code ${code}`
            : `killed with signal ${signal}`,
        )
    })
  })

;(async () => {
  if (
    process.env.NODE_ENV === "development" &&
    fs.existsSync(CHAIN_DOCS_DIST)
  ) {
    console.log(
      `${CHAIN_DOCS_DIST} dir already exists; skipping chain docs generation`,
    )
    process.exit(0)
  }

  for (const network of Object.keys(networks)) {
    if (
      !fs.existsSync(
        path.join(process.cwd(), ".papi", "metadata", `${network}.scale`),
      )
    ) {
      await spawnAndWait(
        path.join(process.cwd(), "node_modules", ".bin", "papi"),
        ["add", "--skip-codegen", "-n", network, network],
      )
    }
  }

  await spawnAndWait(
    path.join(process.cwd(), "node_modules", ".bin", "papi-generate-docs"),
    ["--output", CHAIN_DOCS_DIST],
  )
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
