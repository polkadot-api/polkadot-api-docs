import { FC, PropsWithChildren } from "react"

export const KeyPoint: FC<PropsWithChildren<{ title: string }>> = ({
  title,
  children,
}) => (
  <div className="w-full border rounded-sm border-gray-500 p-4 text-left">
    <div className="text-(--vocs-color_heading) text-lg py-2 font-bold">
      {title}
    </div>
    <div>{children}</div>
  </div>
)
