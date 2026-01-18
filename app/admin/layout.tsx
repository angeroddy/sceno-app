"use client"

import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/app/hooks/useAuth"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X
} from "lucide-react"
import Image from "next/image"
import logoApp from '@/app/assets/images/logoApp.png'
import { createClient } from "@/app/lib/supabase-client"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface SidebarLinkProps {
  href: string
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
}

const SidebarLink = ({ href, icon, label, active, onClick }: SidebarLinkProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left cursor-pointer",
        active
          ? "bg-[#E63832] text-white shadow-md"
          : "text-gray-700 hover:bg-[#E6DAD0]/50"
      )}
    >
      <div className="w-5 h-5">{icon}</div>
      <span className="font-medium">{label}</span>
    </button>
  )
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { loading, userType } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  // Redirection si l'utilisateur n'est pas un admin
  useEffect(() => {
    if (!loading && userType !== 'admin') {
      router.push('/connexion')
    }
  }, [loading, userType, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63832]"></div>
      </div>
    )
  }

  // Afficher le loading pendant la redirection
  if (!loading && userType !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E63832]"></div>
      </div>
    )
  }

  const navigation = [
    {
      href: "/admin",
      icon: <LayoutDashboard />,
      label: "Vue d'ensemble",
    },
    {
      href: "/admin/annonceurs",
      icon: <Users />,
      label: "Annonceurs",
    },
    {
      href: "/admin/opportunites",
      icon: <Calendar />,
      label: "Opportunités",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F5F0EB] to-white">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <Image
            src={logoApp}
            alt="Logo"
            width={60}
            height={60}
            className="cursor-pointer"
            onClick={() => router.push('/')}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white">
          <div className="p-6 space-y-2">
            {navigation.map((item) => (
              <SidebarLink
                key={item.href}
                {...item}
                active={pathname === item.href}
                onClick={() => {
                  router.push(item.href)
                  setMobileMenuOpen(false)
                }}
              />
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Se déconnecter</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-72 bg-white border-r border-gray-200">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
              <Image
                src={logoApp}
                alt="Logo"
                width={80}
                height={80}
                className="cursor-pointer mx-auto"
                onClick={() => router.push('/')}
              />
              <h2 className="text-center mt-4 font-bold text-lg text-gray-900">
                Espace Administrateur
              </h2>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navigation.map((item) => (
                <SidebarLink
                  key={item.href}
                  {...item}
                  active={pathname === item.href}
                  onClick={() => router.push(item.href)}
                />
              ))}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Se déconnecter</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-72">
          {children}
        </main>
      </div>
    </div>
  )
}
