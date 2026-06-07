"use client"

import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface NavItem {
  href: string
  icon: LucideIcon
  label: string
}

interface MobileBottomNavProps {
  items: NavItem[]
}

export default function MobileBottomNav({ items }: MobileBottomNavProps) {
  const router = useRouter()
  const pathname = usePathname()

  const isActive = (href: string) => {
    // Exact match
    if (href === pathname) return true

    // Pour les routes "racines" de dashboard (/admin, /annonceur, /comedien)
    // On ne veut PAS qu'elles matchent leurs sous-routes
    const isDashboardRoot =
      href === "/admin" || href === "/annonceur" || href === "/comedien"
    if (isDashboardRoot) {
      return false // Uniquement match exact (déjà vérifié ci-dessus)
    }

    // Pour les autres routes, on accepte les sous-chemins
    // (ex: /admin/annonceurs/123 est actif pour /admin/annonceurs)
    if (pathname.startsWith(href + "/")) {
      return true
    }

    return false
  }

  // Le nombre de colonnes suit le nombre d'items (3, 4 ou 5) pour éviter
  // qu'un 5e item ne passe sur une 2e ligne (classes statiques pour Tailwind).
  const colsClass =
    {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      5: "grid-cols-5",
    }[items.length] ?? "grid-cols-4"

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-gray-200 pb-safe">
      <div className={cn("grid items-stretch gap-1 px-2 py-2 max-w-lg mx-auto", colsClass)}>
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 transition-all",
                active
                  ? "bg-[#A8D5BA] text-gray-900"
                  : "text-gray-600 hover:text-gray-900 active:scale-95"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-all",
                  active ? "stroke-[2.5]" : "stroke-[2]"
                )}
              />
              <span
                className={cn(
                  "max-w-full text-center text-[11px] leading-tight font-medium transition-all",
                  active ? "font-semibold" : "font-normal"
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
