const UUID_PATTERN = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
const EXACT_UUID_REGEX = new RegExp(`^${UUID_PATTERN}$`)
const UUID_IN_PATH_REGEX = new RegExp(UUID_PATTERN, "g")

export function slugifyOpportunityTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function buildPublicOpportunityPath(title: string, opportunityId: string) {
  const slug = slugifyOpportunityTitle(title)
  return `/opportunite/${slug ? `${slug}--` : ""}${opportunityId}`
}

export function extractOpportunityIdFromPublicParam(param: string) {
  const decodedParam = decodeURIComponent(param)

  if (EXACT_UUID_REGEX.test(decodedParam)) {
    return decodedParam
  }

  const matches = decodedParam.match(UUID_IN_PATH_REGEX)
  return matches?.at(-1) ?? null
}
