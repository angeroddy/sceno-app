import { OPPORTUNITY_STATUS_LABELS, type OpportunityStatus } from "@/app/types"
import { cn } from "@/lib/utils"

const statusStyles: Record<OpportunityStatus, { body: string; fold: string }> = {
  en_attente: {
    body: "bg-amber-500 text-white",
    fold: "border-t-amber-700",
  },
  validee: {
    body: "bg-emerald-600 text-white",
    fold: "border-t-emerald-800",
  },
  refusee: {
    body: "bg-rose-600 text-white",
    fold: "border-t-rose-800",
  },
  expiree: {
    body: "bg-stone-500 text-white",
    fold: "border-t-stone-700",
  },
  complete: {
    body: "bg-sky-600 text-white",
    fold: "border-t-sky-800",
  },
  supprimee: {
    body: "bg-slate-700 text-white",
    fold: "border-t-slate-900",
  },
}

type OpportunityStatusRibbonProps = {
  status: OpportunityStatus
  className?: string
  label?: string
  placement?: "inline" | "corner"
}

export function OpportunityStatusRibbon({
  status,
  className,
  label,
  placement = "inline",
}: OpportunityStatusRibbonProps) {
  const styles = statusStyles[status]
  const displayLabel = label ?? OPPORTUNITY_STATUS_LABELS[status]

  if (placement === "corner") {
    return (
      <span className={cn("pointer-events-none absolute right-0 top-0 z-20 h-24 w-24 overflow-hidden", className)}>
        <span className={cn("absolute right-[6px] top-[7px] h-2 w-2 rotate-45 opacity-80", styles.fold.replace("border-t-", "bg-"))} />
        <span className={cn("absolute bottom-[8px] right-[8px] h-2 w-2 rotate-45 opacity-80", styles.fold.replace("border-t-", "bg-"))} />
        <span
          className={cn(
            "absolute top-[16px] right-[-30px] flex w-[128px] rotate-45 items-center justify-center px-8 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] shadow-md",
            styles.body
          )}
        >
          {displayLabel}
        </span>
      </span>
    )
  }

  return (
    <span className={cn("inline-flex items-stretch shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm",
          "origin-right -skew-x-12",
          styles.body
        )}
      >
        <span className="skew-x-12 whitespace-nowrap">{displayLabel}</span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "mt-auto h-0 w-0 border-l-[10px] border-l-transparent border-t-[10px]",
          styles.fold
        )}
      />
    </span>
  )
}
