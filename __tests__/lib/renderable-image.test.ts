import { buildRenderableImageSrc, IMAGE_RETRY_LIMIT } from '@/app/lib/renderable-image'

describe('renderable-image', () => {
  it('ajoute un cache-buster aux urls distantes', () => {
    expect(buildRenderableImageSrc('https://cdn.example.com/image.webp', 123)).toBe(
      'https://cdn.example.com/image.webp?img_reload=123'
    )
  })

  it('préserve les query params existants', () => {
    expect(buildRenderableImageSrc('https://cdn.example.com/image.webp?token=abc', 456)).toBe(
      'https://cdn.example.com/image.webp?token=abc&img_reload=456'
    )
  })

  it('laisse intactes les urls blob et data', () => {
    expect(buildRenderableImageSrc('blob:http://localhost/test', 1)).toBe('blob:http://localhost/test')
    expect(buildRenderableImageSrc('data:image/webp;base64,abc', 1)).toBe('data:image/webp;base64,abc')
  })

  it('expose une limite de retry bornée', () => {
    expect(IMAGE_RETRY_LIMIT).toBe(2)
  })
})
