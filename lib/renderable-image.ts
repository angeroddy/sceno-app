const IMAGE_RELOAD_PARAM = "img_reload"

export const IMAGE_RETRY_LIMIT = 2

export function buildRenderableImageSrc(source: string, cacheKey: number) {
  if (!source || source.startsWith("blob:") || source.startsWith("data:")) {
    return source
  }

  try {
    const url = new URL(source)
    url.searchParams.set(IMAGE_RELOAD_PARAM, String(cacheKey))
    return url.toString()
  } catch {
    const separator = source.includes("?") ? "&" : "?"
    return `${source}${separator}${IMAGE_RELOAD_PARAM}=${cacheKey}`
  }
}
