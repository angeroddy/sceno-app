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

    // Pour les routes "racines" de dashboard (/admin ou /annonceur)
    // On ne veut PAS qu'elles matchent leurs sous-routes
    const isDashboardRoot = href === "/admin" || href === "/annonceur"
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

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)

          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[70px]",
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
                  "text-xs font-medium transition-all",
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
