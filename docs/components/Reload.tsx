import React from "react"

/**
 * Related to pregen.ts
 * @see https://github.com/wevm/vocs/issues/210
 */

const Reload: React.FC = () => {
  if (globalThis.window) {
    globalThis.window.location.reload()
  }

  return (
    <>
      <p className="vocs_Paragraph">You will see chain docs in a moment</p>
      <aside className="vocs_Aside vocs_Callout vocs_Callout_warning">
        <p className="vocs_Paragraph">
          if you experience infinite reloads, then you probably need to run
          <code className="vocs_Code">pnpm build:chain-docs</code>
        </p>
      </aside>
    </>
  )
}

export default Reload
