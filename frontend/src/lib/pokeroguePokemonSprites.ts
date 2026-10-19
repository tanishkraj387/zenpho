type AtlasFrame = {
  filename: string
  frame: { x: number; y: number; w: number; h: number }
  sourceSize: { w: number; h: number }
  spriteSourceSize: { x: number; y: number; w: number; h: number }
}

type PokemonAtlas = { textures?: { frames: AtlasFrame[] }[]; frames?: AtlasFrame[] }

export type LoadedPokemonSprite = {
  image: HTMLImageElement
  frames: AtlasFrame[]
}

const atlasCache = new Map<number, Promise<LoadedPokemonSprite>>()

export function loadPokemonSprite(id: number) {
  const cached = atlasCache.get(id)
  if (cached) return cached

  const atlas = (async () => {
    const [metadataResponse, image] = await Promise.all([
      fetch(`/pokerogue/pokemon/${id}.json`),
      (async () => {
        const sprite = new Image()
        sprite.src = `/pokerogue/pokemon/${id}.png`
        await sprite.decode()
        return sprite
      })(),
    ])

    if (!metadataResponse.ok) throw new Error(`PokéRogue sprite metadata missing for Pokémon ${id}`)
    const metadata = await metadataResponse.json() as PokemonAtlas
    const frames = (metadata.textures?.[0]?.frames ?? metadata.frames ?? [])
      .filter((frame) => frame.filename.endsWith('.png'))
      .sort((left, right) => Number.parseInt(left.filename, 10) - Number.parseInt(right.filename, 10)) ?? []
    if (!frames.length) throw new Error(`PokéRogue sprite atlas is empty for Pokémon ${id}`)
    return { image, frames }
  })()

  atlasCache.set(id, atlas)
  atlas.catch(() => atlasCache.delete(id))
  return atlas
}

export function drawPokemonSprite(
  context: CanvasRenderingContext2D,
  sprite: LoadedPokemonSprite,
  frameIndex: number,
  x: number,
  y: number,
  size: number,
  mirror = false,
) {
  const frame = sprite.frames[frameIndex % sprite.frames.length]
  const scale = size / Math.max(frame.sourceSize.w, frame.sourceSize.h)
  const width = frame.sourceSize.w * scale
  const height = frame.sourceSize.h * scale
  const drawX = x - width / 2
  const drawY = y - height / 2

  context.save()
  if (mirror) {
    context.translate(x * 2, 0)
    context.scale(-1, 1)
  }
  context.drawImage(
    sprite.image,
    frame.frame.x,
    frame.frame.y,
    frame.frame.w,
    frame.frame.h,
    drawX + frame.spriteSourceSize.x * scale,
    drawY + frame.spriteSourceSize.y * scale,
    frame.spriteSourceSize.w * scale,
    frame.spriteSourceSize.h * scale,
  )
  context.restore()
}

export function pokemonIdFromSpriteUrl(url: string) {
  const match = url.match(/\/pokemon\/(\d+)\.png/)
  return match ? Number(match[1]) : null
}
