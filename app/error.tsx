"use client"

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F5F0EB] px-4 text-center">
      <h1 className="text-6xl font-bold text-gray-900">Erreur</h1>
      <p className="mt-4 text-xl text-gray-600">
        Une erreur inattendue s&apos;est produite.
      </p>
      <button
        onClick={reset}
        className="mt-8 inline-flex items-center rounded-md bg-[#E63832] px-6 py-3 text-sm font-medium text-white hover:bg-[#E63832]/90"
      >
        Réessayer
      </button>
    </main>
  )
}
