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

const FRENCH_BICS = [
  "BNPAFRPP",
  "SOGEFRPP",
  "CCBPFRPP",
  "CMCIFRPP",
  "AGRIFRPP",
  "PSSTFRPP",
  "BREDFRPP",
  "CRLYFRPP",
  "NATXFRPP",
  "BDFEFR2L",
] as const

function calculateMod97(input: string): number {
  let remainder = 0

  for (const char of input) {
    remainder = (remainder * 10 + Number(char)) % 97
  }

  return remainder
}

function createFrenchIban(bankCode: string, branchCode: string, accountNumber: string, ribKey: string): string {
  const bban = `${bankCode}${branchCode}${accountNumber}${ribKey}`
  const rearranged = `${bban}152700`
  const numeric = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55))
  const checkDigits = 98 - calculateMod97(numeric)
  return `FR${String(checkDigits).padStart(2, "0")}${bban}`
}

const PERSONAL_ADVERTISER_SEEDS = [
  { nom: "Leroy", prenom: "Camille", date_naissance: "1991-04-12", adresse_rue: "14 rue de la Paix", adresse_ville: "Paris", adresse_code_postal: "75008", telephone: "+33 6 12 34 56 78" },
  { nom: "Bernard", prenom: "Léo", date_naissance: "1989-11-04", adresse_rue: "8 avenue des Lilas", adresse_ville: "Lyon", adresse_code_postal: "69002", telephone: "+33 6 98 76 54 32" },
  { nom: "Moreau", prenom: "Ines", date_naissance: "1993-07-21", adresse_rue: "27 rue Nationale", adresse_ville: "Lille", adresse_code_postal: "59800", telephone: "+33 6 44 21 10 87" },
  { nom: "Roussel", prenom: "Hugo", date_naissance: "1987-03-15", adresse_rue: "5 place Graslin", adresse_ville: "Nantes", adresse_code_postal: "44000", telephone: "+33 6 31 87 65 20" },
  { nom: "Faure", prenom: "Sarah", date_naissance: "1990-09-28", adresse_rue: "19 rue Sainte-Catherine", adresse_ville: "Bordeaux", adresse_code_postal: "33000", telephone: "+33 6 72 18 43 95" },
  { nom: "Giraud", prenom: "Noah", date_naissance: "1985-01-09", adresse_rue: "42 cours Mirabeau", adresse_ville: "Aix-en-Provence", adresse_code_postal: "13100", telephone: "+33 6 53 20 48 16" },
  { nom: "Chevalier", prenom: "Manon", date_naissance: "1994-12-02", adresse_rue: "11 rue Foch", adresse_ville: "Montpellier", adresse_code_postal: "34000", telephone: "+33 6 25 67 91 34" },
  { nom: "Robin", prenom: "Yanis", date_naissance: "1988-06-17", adresse_rue: "7 rue des Tanneurs", adresse_ville: "Strasbourg", adresse_code_postal: "67000", telephone: "+33 6 60 19 74 52" },
  { nom: "Perrin", prenom: "Julie", date_naissance: "1992-05-30", adresse_rue: "23 rue du Port", adresse_ville: "La Rochelle", adresse_code_postal: "17000", telephone: "+33 6 84 22 50 13" },
  { nom: "Marchal", prenom: "Théo", date_naissance: "1986-10-11", adresse_rue: "3 rue de Metz", adresse_ville: "Toulouse", adresse_code_postal: "31000", telephone: "+33 6 47 82 15 69" },
] as const

const COMPANY_ADVERTISER_SEEDS = [
  {
    nom_formation: "Lycée des Arts Scéniques",
    nom_entreprise: "Lycée des Arts Scéniques SARL",
    type_juridique: "sarl",
    numero_legal: "732829320",
    siege_rue: "14 rue de la Paix",
    siege_ville: "Paris",
    siege_code_postal: "75008",
    telephone: "+33 1 23 45 67 89",
    representant_nom: "Leroy",
    representant_prenom: "Claire",
    representant_telephone: "+33 6 12 34 56 78",
    representant_date_naissance: "1986-08-04",
    representant_adresse_rue: "14 rue de la Paix",
    representant_adresse_ville: "Paris",
    representant_adresse_code_postal: "75008",
  },
  {
    nom_formation: "Atelier Vocal Studio",
    nom_entreprise: "Atelier Vocal Studio SAS",
    type_juridique: "sas",
    numero_legal: "893829101",
    siege_rue: "22 boulevard Voltaire",
    siege_ville: "Paris",
    siege_code_postal: "75011",
    telephone: "+33 1 45 32 10 98",
    representant_nom: "Noel",
    representant_prenom: "Sophie",
    representant_telephone: "+33 6 98 76 54 32",
    representant_date_naissance: "1981-02-17",
    representant_adresse_rue: "5 rue du Théâtre",
    representant_adresse_ville: "Paris",
    representant_adresse_code_postal: "75003",
  },
  {
    nom_formation: "Studio Impro Lyon",
    nom_entreprise: "Studio Impro Lyon SASU",
    type_juridique: "sasu",
    numero_legal: "521483907",
    siege_rue: "16 rue Mercière",
    siege_ville: "Lyon",
    siege_code_postal: "69002",
    telephone: "+33 4 72 18 45 60",
    representant_nom: "Garcia",
    representant_prenom: "Emma",
    representant_telephone: "+33 6 44 21 10 87",
    representant_date_naissance: "1984-03-19",
    representant_adresse_rue: "8 rue Mercière",
    representant_adresse_ville: "Lyon",
    representant_adresse_code_postal: "69002",
  },
  {
    nom_formation: "Compagnie du Canal",
    nom_entreprise: "Compagnie du Canal Association",
    type_juridique: "association",
    numero_legal: "812774390",
    siege_rue: "4 quai de la Fosse",
    siege_ville: "Nantes",
    siege_code_postal: "44000",
    telephone: "+33 2 40 67 18 24",
    representant_nom: "Dupin",
    representant_prenom: "Alice",
    representant_telephone: "+33 6 31 87 65 20",
    representant_date_naissance: "1979-07-06",
    representant_adresse_rue: "18 rue Kervegan",
    representant_adresse_ville: "Nantes",
    representant_adresse_code_postal: "44000",
  },
  {
    nom_formation: "Académie Jeu Bordeaux",
    nom_entreprise: "Académie Jeu Bordeaux EURL",
    type_juridique: "eurl",
    numero_legal: "443920176",
    siege_rue: "31 cours Victor Hugo",
    siege_ville: "Bordeaux",
    siege_code_postal: "33000",
    telephone: "+33 5 56 21 43 10",
    representant_nom: "Faure",
    representant_prenom: "Mila",
    representant_telephone: "+33 6 72 18 43 95",
    representant_date_naissance: "1988-11-13",
    representant_adresse_rue: "11 rue des Remparts",
    representant_adresse_ville: "Bordeaux",
    representant_adresse_code_postal: "33000",
  },
  {
    nom_formation: "Scène Active Provence",
    nom_entreprise: "Scène Active Provence SARL",
    type_juridique: "sarl",
    numero_legal: "501276348",
    siege_rue: "9 cours Sextius",
    siege_ville: "Aix-en-Provence",
    siege_code_postal: "13100",
    telephone: "+33 4 42 51 82 70",
    representant_nom: "Garnier",
    representant_prenom: "Louis",
    representant_telephone: "+33 6 53 20 48 16",
    representant_date_naissance: "1983-05-24",
    representant_adresse_rue: "6 rue Mignet",
    representant_adresse_ville: "Aix-en-Provence",
    representant_adresse_code_postal: "13100",
  },
  {
    nom_formation: "Collectif Mise en Voix",
    nom_entreprise: "Collectif Mise en Voix Association",
    type_juridique: "association",
    numero_legal: "824165309",
    siege_rue: "12 rue de Verdun",
    siege_ville: "Montpellier",
    siege_code_postal: "34000",
    telephone: "+33 4 67 43 19 25",
    representant_nom: "Chevalier",
    representant_prenom: "Nora",
    representant_telephone: "+33 6 25 67 91 34",
    representant_date_naissance: "1987-09-09",
    representant_adresse_rue: "3 rue de l'Aiguillerie",
    representant_adresse_ville: "Montpellier",
    representant_adresse_code_postal: "34000",
  },
  {
    nom_formation: "École du Plateau",
    nom_entreprise: "École du Plateau SAS",
    type_juridique: "sas",
    numero_legal: "390518274",
    siege_rue: "28 rue des Francs-Bourgeois",
    siege_ville: "Strasbourg",
    siege_code_postal: "67000",
    telephone: "+33 3 88 22 41 63",
    representant_nom: "Ritter",
    representant_prenom: "Pauline",
    representant_telephone: "+33 6 60 19 74 52",
    representant_date_naissance: "1982-04-01",
    representant_adresse_rue: "10 rue du Dôme",
    representant_adresse_ville: "Strasbourg",
    representant_adresse_code_postal: "67000",
  },
  {
    nom_formation: "Atelier des Embruns",
    nom_entreprise: "Atelier des Embruns SCI",
    type_juridique: "sci",
    numero_legal: "479218605",
    siege_rue: "6 quai Duperré",
    siege_ville: "La Rochelle",
    siege_code_postal: "17000",
    telephone: "+33 5 46 28 14 92",
    representant_nom: "Perrin",
    representant_prenom: "Arthur",
    representant_telephone: "+33 6 84 22 50 13",
    representant_date_naissance: "1978-12-18",
    representant_adresse_rue: "14 rue Saint-Jean-du-Pérot",
    representant_adresse_ville: "La Rochelle",
    representant_adresse_code_postal: "17000",
  },
  {
    nom_formation: "Fabrique des Talents",
    nom_entreprise: "Fabrique des Talents SAS",
    type_juridique: "sas",
    numero_legal: "913640572",
    siege_rue: "18 rue d'Alsace-Lorraine",
    siege_ville: "Toulouse",
    siege_code_postal: "31000",
    telephone: "+33 5 61 33 29 84",
    representant_nom: "Marchal",
    representant_prenom: "Jeanne",
    representant_telephone: "+33 6 47 82 15 69",
    representant_date_naissance: "1985-06-27",
    representant_adresse_rue: "2 rue du Taur",
    representant_adresse_ville: "Toulouse",
    representant_adresse_code_postal: "31000",
  },
] as const

const ADVERTISER_DEMO_FIXTURES_BY_TYPE = {
  personne_physique: PERSONAL_ADVERTISER_SEEDS.map((seed, index) => ({
    type_annonceur: "personne_physique" as const,
    ...seed,
    adresse_pays: BASE_ADDRESS.pays,
    nom_titulaire_compte: `${seed.prenom} ${seed.nom}`,
    iban: createFrenchIban(
      "3000" + String((index % 7) + 1).padStart(1, "0"),
      "6000" + String((index % 9) + 1).padStart(1, "0"),
      `123456789${String(index).padStart(2, "0")}`,
      String(10 + index).padStart(2, "0")
    ),
    bic_swift: FRENCH_BICS[index % FRENCH_BICS.length],
  })),
  entreprise: COMPANY_ADVERTISER_SEEDS.map((seed, index) => ({
    type_annonceur: "entreprise" as const,
    ...seed,
    pays_entreprise: BASE_ADDRESS.pays,
    siege_pays: BASE_ADDRESS.pays,
    representant_adresse_pays: BASE_ADDRESS.pays,
    nom_titulaire_compte: seed.nom_entreprise,
    iban: createFrenchIban(
      "2004" + String((index % 8) + 1).padStart(1, "0"),
      "1000" + String((index % 9) + 1).padStart(1, "0"),
      `987654321${String(index).padStart(2, "0")}`,
      String(21 + index).padStart(2, "0")
    ),
    bic_swift: FRENCH_BICS[(index + 3) % FRENCH_BICS.length],
  })),
}

const ADVERTISER_DEMO_SEQUENCE: TypeAnnonceur[] = ["personne_physique", "entreprise"]
const COMEDIAN_DEMO_FIXTURE_SEEDS = [
  { lastName: "Durand", firstName: "Anaïs", birthDate: "1994-06-18", gender: "feminin", demoLink: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", preferences: { stages: true, formations: true, coachs: true, services: false } },
  { lastName: "Martin", firstName: "Julien", birthDate: "1990-11-22", gender: "masculin", demoLink: "https://vimeo.com/76979871", preferences: { stages: true, formations: false, coachs: false, services: true } },
  { lastName: "Dupuy", firstName: "Léa", birthDate: "1995-03-08", gender: "non_genre", demoLink: "https://soundcloud.com/forss/flickermood", preferences: { stages: false, formations: true, coachs: true, services: true } },
  { lastName: "Rivière", firstName: "Malo", birthDate: "1992-08-14", gender: "masculin", demoLink: "https://www.dailymotion.com/video/x84sh2k", preferences: { stages: true, formations: true, coachs: false, services: false } },
  { lastName: "Chevallier", firstName: "Nina", birthDate: "1998-01-30", gender: "feminin", demoLink: "https://www.youtube.com/watch?v=ysz5S6PUM-U", preferences: { stages: false, formations: true, coachs: false, services: true } },
  { lastName: "Pons", firstName: "Aksel", birthDate: "1988-05-27", gender: "non_genre", demoLink: "https://vimeo.com/148751763", preferences: { stages: true, formations: false, coachs: true, services: true } },
  { lastName: "Moulin", firstName: "Clara", birthDate: "1996-09-12", gender: "feminin", demoLink: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", preferences: { stages: true, formations: true, coachs: false, services: true } },
  { lastName: "Boyer", firstName: "Sacha", birthDate: "1991-04-03", gender: "masculin", demoLink: "https://vimeo.com/22439234", preferences: { stages: false, formations: false, coachs: true, services: true } },
  { lastName: "Armand", firstName: "Élise", birthDate: "1993-12-19", gender: "feminin", demoLink: "https://www.youtube.com/watch?v=jNQXAC9IVRw", preferences: { stages: true, formations: true, coachs: true, services: true } },
  { lastName: "Loiseau", firstName: "Noé", birthDate: "1987-07-07", gender: "masculin", demoLink: "https://vimeo.com/90509568", preferences: { stages: true, formations: false, coachs: true, services: false } },
  { lastName: "Schmitt", firstName: "Zoé", birthDate: "1997-02-24", gender: "feminin", demoLink: "https://www.youtube.com/watch?v=ScMzIvxBSi4", preferences: { stages: false, formations: true, coachs: true, services: false } },
  { lastName: "Vidal", firstName: "Yanis", birthDate: "1989-10-10", gender: "masculin", demoLink: "https://vimeo.com/357274789", preferences: { stages: true, formations: false, coachs: false, services: true } },
  { lastName: "Gilbert", firstName: "Mila", birthDate: "1994-03-11", gender: "feminin", demoLink: "https://www.youtube.com/watch?v=5qap5aO4i9A", preferences: { stages: false, formations: true, coachs: true, services: true } },
  { lastName: "Lacoste", firstName: "Ilyes", birthDate: "1992-06-06", gender: "masculin", demoLink: "https://vimeo.com/3274372", preferences: { stages: true, formations: true, coachs: false, services: false } },
  { lastName: "Blin", firstName: "Tess", birthDate: "1999-11-05", gender: "non_genre", demoLink: "https://www.youtube.com/watch?v=oHg5SJYRHA0", preferences: { stages: true, formations: false, coachs: true, services: true } },
  { lastName: "Maurin", firstName: "Lina", birthDate: "1990-01-17", gender: "feminin", demoLink: "https://vimeo.com/1084537", preferences: { stages: false, formations: true, coachs: false, services: true } },
  { lastName: "Renaud", firstName: "Baptiste", birthDate: "1986-09-29", gender: "masculin", demoLink: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", preferences: { stages: true, formations: true, coachs: true, services: false } },
  { lastName: "Colin", firstName: "Jade", birthDate: "1995-05-04", gender: "feminin", demoLink: "https://vimeo.com/143418951", preferences: { stages: false, formations: false, coachs: true, services: true } },
  { lastName: "Navarro", firstName: "Eden", birthDate: "1993-08-26", gender: "non_genre", demoLink: "https://www.youtube.com/watch?v=ysz5S6PUM-U", preferences: { stages: true, formations: true, coachs: false, services: true } },
  { lastName: "Meunier", firstName: "Robin", birthDate: "1988-12-21", gender: "masculin", demoLink: "https://vimeo.com/7419530", preferences: { stages: true, formations: false, coachs: true, services: false } },
] as const

const COMEDIAN_DEMO_FIXTURES: DemoComedianPayload[] = COMEDIAN_DEMO_FIXTURE_SEEDS.map((seed) => ({
  preferences: seed.preferences,
  personalInfo: {
    lastName: seed.lastName,
    firstName: seed.firstName,
    birthDate: seed.birthDate,
    gender: seed.gender,
    photo: null,
    demoLink: seed.demoLink,
  },
  accountInfo: {
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: true,
  },
}))

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
