import * as Tabs from "@radix-ui/react-tabs"
import { PropsWithChildren } from "react"
import "./Tabs.css"

export const Root = ({
  options,
  children,
}: PropsWithChildren<{
  options: Record<string, string>
}>) => (
  <Tabs.Root
    className="Tabs__root border rounded bg-[--vocs-color_codeBlockBackground] border-[--vocs-color_codeInlineBorder]"
    defaultValue={Object.keys(options)[0]}
  >
    <Tabs.List className="Tabs__list flex flex-wrap px-2 bg-[--vocs-color_codeTitleBackground]">
      {Object.entries(options).map(([value, label]) => (
        <Tabs.Trigger
          key={value}
          className="text-sm p-3 pb-2 text-[--vocs-color_text3] border-b border-transparent hover:text-[--vocs-color_text] [&[data-state='active']]:text-[--vocs-color_text] [&[data-state='active']]:border-[--vocs-color_borderAccent]"
          value={value}
        >
          {label}
        </Tabs.Trigger>
      ))}
    </Tabs.List>
    {children}
  </Tabs.Root>
)
export const Content = (props: Tabs.TabsContentProps) => (
  <Tabs.Content {...props} />
)
