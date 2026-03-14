import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Connexion",
  description:
    "Connectez-vous à votre espace Scenio pour accéder aux meilleures offres de stages, ateliers et formations pour comédiens.",
  alternates: { canonical: "/connexion" },
}

export default function ConnexionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
