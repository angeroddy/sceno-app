import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Inscription Comédien",
  description:
    "Créez votre compte comédien sur Scenio et recevez des offres exclusives sur les stages, ateliers et formations du monde du théâtre et du cinéma.",
  alternates: { canonical: "/inscription" },
}

export default function InscriptionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
