import type {
  InscriptionAnnonceurForm,
  TypeAnnonceur,
} from "@/app/types"

export const isDevMode = process.env.NODE_ENV !== "production"

export interface DemoComedianPayload {
  preferences: {
    stages: boolean
    formations: boolean
    coachs: boolean
    services: boolean
  }
  personalInfo: {
    lastName: string
    firstName: string
    birthDate: string
    gender: "masculin" | "feminin" | "non_genre"
    photo: null
    demoLink: string
  }
  accountInfo: {
    email: string
    password: string
    confirmPassword: string
    acceptTerms: boolean
  }
}

const BASE_ADDRESS = {
  rue: "14 rue de la Paix",
  ville: "Paris",
  codePostal: "75008",
  pays: "France",
}

export function getDemoAdvertiserData(
  preferredType?: TypeAnnonceur
): Partial<InscriptionAnnonceurForm> {
  const typeAnnuaire =
    preferredType || (Math.random() < 0.5 ? "personne_physique" : "entreprise")

  if (typeAnnuaire === "personne_physique") {
    return {
      type_annonceur: "personne_physique",
      nom: "Leroy",
      prenom: "Camille",
      date_naissance: "1991-04-12",
      adresse_rue: BASE_ADDRESS.rue,
      adresse_ville: BASE_ADDRESS.ville,
      adresse_code_postal: BASE_ADDRESS.codePostal,
      adresse_pays: BASE_ADDRESS.pays,
      telephone: "+33 6 12 34 56 78",
      nom_titulaire_compte: "Camille Leroy",
      iban: "FR7630006000011234567890189",
      bic_swift: "BNPAFRPP",
    }
  }

  return {
    type_annonceur: "entreprise",
    nom_formation: "Lycée des Arts Scéniques",
    nom_entreprise: "Lycée des Arts Scéniques SARL",
    type_juridique: "sarl",
    pays_entreprise: BASE_ADDRESS.pays,
    numero_legal: "732829320",
    siege_rue: BASE_ADDRESS.rue,
    siege_ville: BASE_ADDRESS.ville,
    siege_code_postal: BASE_ADDRESS.codePostal,
    siege_pays: BASE_ADDRESS.pays,
    telephone: "+33 1 23 45 67 89",
    representant_nom: "Leroy",
    representant_prenom: "Claire",
    representant_date_naissance: "1986-08-04",
    representant_adresse_rue: BASE_ADDRESS.rue,
    representant_adresse_ville: BASE_ADDRESS.ville,
    representant_adresse_code_postal: BASE_ADDRESS.codePostal,
    representant_adresse_pays: BASE_ADDRESS.pays,
    nom_titulaire_compte: "Lycée des Arts Scéniques SARL",
    iban: "FR7630006000011234567890189",
    bic_swift: "NATXFRPP",
  }
}

export function getDemoComedianData(): DemoComedianPayload {
  return {
    preferences: {
      stages: true,
      formations: true,
      coachs: true,
      services: false,
    },
    personalInfo: {
      lastName: "Durand",
      firstName: "Anaïs",
      birthDate: "1994-06-18",
      gender: "feminin",
      photo: null,
      demoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    accountInfo: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: true,
    },
  }
}
