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

const ADVERTISER_DEMO_FIXTURES_BY_TYPE = {
  personne_physique: [
    {
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
    },
    {
      type_annonceur: "personne_physique",
      nom: "Bernard",
      prenom: "Léo",
      date_naissance: "1989-11-04",
      adresse_rue: "8 avenue des Lilas",
      adresse_ville: "Lyon",
      adresse_code_postal: "69002",
      adresse_pays: "France",
      telephone: "+33 6 98 76 54 32",
      nom_titulaire_compte: "Léo Bernard",
      iban: "FR7630006000011234567890254",
      bic_swift: "NATXFRPP",
    },
  ],
  entreprise: [
    {
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
    },
    {
      type_annonceur: "entreprise",
      nom_formation: "Atelier Vocal Studio",
      nom_entreprise: "Atelier Vocal Studio SAS",
      type_juridique: "sas",
      pays_entreprise: BASE_ADDRESS.pays,
      numero_legal: "893829101",
      siege_rue: "22 boulevard Voltaire",
      siege_ville: "Paris",
      siege_code_postal: "75011",
      siege_pays: BASE_ADDRESS.pays,
      telephone: "+33 6 45 32 10 98",
      representant_nom: "Noel",
      representant_prenom: "Sophie",
      representant_date_naissance: "1981-02-17",
      representant_adresse_rue: "5 rue du Théâtre",
      representant_adresse_ville: "Paris",
      representant_adresse_code_postal: "75003",
      representant_adresse_pays: BASE_ADDRESS.pays,
      nom_titulaire_compte: "Atelier Vocal Studio SAS",
      iban: "FR1230006000019876543210567",
      bic_swift: "SOGEFRPP",
    },
  ],
}

const ADVERTISER_DEMO_SEQUENCE: TypeAnnonceur[] = ["personne_physique", "entreprise"]
const COMEDIAN_DEMO_FIXTURES: DemoComedianPayload[] = [
  {
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
  },
  {
    preferences: {
      stages: true,
      formations: false,
      coachs: false,
      services: true,
    },
    personalInfo: {
      lastName: "Martin",
      firstName: "Julien",
      birthDate: "1990-11-22",
      gender: "masculin",
      photo: null,
      demoLink: "https://vimeo.com/76979871",
    },
    accountInfo: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: true,
    },
  },
  {
    preferences: {
      stages: false,
      formations: true,
      coachs: true,
      services: true,
    },
    personalInfo: {
      lastName: "Dupuy",
      firstName: "Lea",
      birthDate: "1995-03-08",
      gender: "non_genre",
      photo: null,
      demoLink: "https://soundcloud.com/",
    },
    accountInfo: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: true,
    },
  },
]

const DEMO_FIXTURE_STORE_PREFIX = "scenio-demo-fixture-cursor"
const advertiserTypeCursor: Record<"fallback" | TypeAnnonceur, number> = {
  fallback: 0,
  personne_physique: 0,
  entreprise: 0,
}
const advertiserTypeLastIndex: Record<"fallback" | TypeAnnonceur, number | null> = {
  fallback: getStoredValue<number | null>("last-fallback", null),
  personne_physique: getStoredValue<number | null>("last-personne_physique", null),
  entreprise: getStoredValue<number | null>("last-entreprise", null),
}
let comedianDemoCursor = getStoredCursor("comedian", 0)
let comedianLastIndex: number | null = getStoredValue<number | null>("last-comedian", null)

function getStoredCursor(key: string, fallback: number): number {
  try {
    if (typeof window === "undefined") return fallback
    const raw = window.localStorage.getItem(`${DEMO_FIXTURE_STORE_PREFIX}-${key}`)
    if (!raw) return fallback

    const value = Number.parseInt(raw, 10)
    if (!Number.isFinite(value) || value < 0) return fallback
    return value
  } catch {
    return fallback
  }
}

function setStoredCursor(key: string, value: number) {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(`${DEMO_FIXTURE_STORE_PREFIX}-${key}`, String(value))
  } catch {
    // Ignore in environments where localStorage is unavailable
  }
}

function getStoredValue<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback
    const raw = window.localStorage.getItem(`${DEMO_FIXTURE_STORE_PREFIX}-${key}`)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed as T
  } catch {
    return fallback
  }
}

function setStoredValue<T>(key: string, value: T) {
  try {
    if (typeof window === "undefined") return
    window.localStorage.setItem(`${DEMO_FIXTURE_STORE_PREFIX}-${key}`, JSON.stringify(value))
  } catch {
    // Ignore in environments where localStorage is unavailable
  }
}

function getNextIndexAvoidRepeat(
  key: "fallback" | TypeAnnonceur,
  length: number,
  last: number | null
): { index: number; nextCursor: number; nextLast: number } {
  const cursor = getStoredCursor(key, advertiserTypeCursor[key])
  let index = cursor % length

  if (length > 1 && last !== null && index === last) {
    index = (index + 1) % length
  }

  const nextCursor = cursor + 1
  advertiserTypeCursor[key] = nextCursor
  setStoredCursor(key, nextCursor)
  return { index, nextCursor, nextLast: index }
}

function getNextAdvertiserFixtureIndex(key: "fallback" | TypeAnnonceur, length: number): number {
  const { index, nextLast } = getNextIndexAvoidRepeat(key, length, advertiserTypeLastIndex[key])
  advertiserTypeLastIndex[key] = nextLast
  setStoredValue(`last-${key}`, nextLast)
  return index
}

const getNextAdvertiserFallbackFixture = (): Partial<InscriptionAnnonceurForm> => {
  const sequenceIndex = getNextAdvertiserFixtureIndex("fallback", ADVERTISER_DEMO_SEQUENCE.length)
  const fixtureType = ADVERTISER_DEMO_SEQUENCE[sequenceIndex]
  return getNextAdvertiserFixtureByType(fixtureType)
}

const getNextAdvertiserFixtureByType = (type: TypeAnnonceur): Partial<InscriptionAnnonceurForm> => {
  const fixtures = ADVERTISER_DEMO_FIXTURES_BY_TYPE[type]
  const index = getNextAdvertiserFixtureIndex(type, fixtures.length)
  return {
    ...fixtures[index],
  } as Partial<InscriptionAnnonceurForm>
}

const getNextComedianFixture = (): DemoComedianPayload => {
  const length = COMEDIAN_DEMO_FIXTURES.length
  let index = comedianDemoCursor % length
  if (length > 1 && comedianLastIndex !== null && index === comedianLastIndex) {
    index = (index + 1) % length
  }
  comedianDemoCursor += 1
  setStoredCursor("comedian", comedianDemoCursor)
  comedianLastIndex = index
  setStoredValue("comedian-last", comedianLastIndex)
  return COMEDIAN_DEMO_FIXTURES[index]
}

export function getDemoAdvertiserData(
  preferredType?: TypeAnnonceur
): Partial<InscriptionAnnonceurForm> {
  if (preferredType) {
    return getNextAdvertiserFixtureByType(preferredType)
  }
  return getNextAdvertiserFallbackFixture()
}

export function getDemoComedianData(): DemoComedianPayload {
  return getNextComedianFixture()
}
