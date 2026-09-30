import { Loader2 } from "lucide-react"

export function Spinner() {
  return (
    <span className="flex items-center gap-2">
      <Loader2 className="h-5 w-5 animate-spin" />
    </span>
  )
}

