import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Inscription Annonceur",
  description:
    "Créez votre compte annonceur sur Scenio et publiez vos offres de stages, ateliers et formations à destination des comédiens.",
  alternates: { canonical: "/inscription/annonceur" },
}

export default function InscriptionAnnonceurLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
