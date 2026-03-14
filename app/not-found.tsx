import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Page introuvable",
  description: "La page que vous recherchez n'existe pas ou a été déplacée.",
}

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F5F0EB] px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-xl text-gray-600">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-md bg-[#E63832] px-6 py-3 text-sm font-medium text-white hover:bg-[#E63832]/90"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
