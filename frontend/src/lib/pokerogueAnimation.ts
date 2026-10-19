// Adapted from pagefaultgames/pokerogue, src/data/battle-anims.ts.
// SPDX-FileCopyrightText: 2024-2026 Pagefault Games
// SPDX-License-Identifier: AGPL-3.0-only
import { drawPokemonSprite, loadPokemonSprite, type LoadedPokemonSprite } from './pokeroguePokemonSprites'

export type AnimFrame = {
  x: number; y: number; zoomX: number; zoomY: number; visible: boolean
  target: number; graphicFrame: number; opacity: number; focus: number
  priority?: number; angle?: number; mirror?: boolean; blendType?: number
  locked?: boolean; tone?: [number, number, number, number]
}
export type TimedEvent = {
  eventType: string; resourceName: string; volume?: number; pitch?: number
  bgX?: number; bgY?: number; opacity?: number; duration?: number
}
export type MoveAnimation = {
  graphic: string; frames: AnimFrame[][]; frameTimedEvents?: Record<string, TimedEvent[]>
}
export type LoadedMoveAnimation = {
  data: MoveAnimation; sheet: HTMLImageElement | null; backgrounds: Map<string, HTMLImageElement>
  opponentVariant: boolean
}
export const BATTLE_WIDTH = 320
export const BATTLE_HEIGHT = 180
export const MOVE_FRAME_MS = 50
export const positions = { player: { x: 106, y: 148 }, enemy: { x: 236, y: 84 } }
const imageCache = new Map<string, Promise<HTMLImageElement>>()
const animationCache = new Map<string, Promise<LoadedMoveAnimation>>()
const tintCache = new WeakMap<LoadedPokemonSprite, Map<string, HTMLCanvasElement>>()

export function prepareBattleScene(playerId: number, enemyId: number) {
  return Promise.all([
    loadPokemonSprite(playerId, true), loadPokemonSprite(enemyId),
    ...['grass_bg', 'grass_a', 'grass_b'].map(name => loadBattleImage(`/pokerogue/images/arenas/${name}.png`)),
  ])
}

export function loadBattleImage(url: string) {
  let result = imageCache.get(url)
  if (!result) {
    result = (async () => {
      const image = new Image()
      image.src = url
      await image.decode()
      return image
    })()
    imageCache.set(url, result)
    void result.catch(() => imageCache.delete(url))
  }
  return result
}

export function loadMoveAnimation(id: string, attacker: 'player' | 'enemy' = 'player') {
  if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error('Invalid move animation'))
  const key = `${id}:${attacker}`
  let result = animationCache.get(key)
  if (!result) {
    result = (async () => {
      const response = await fetch(`/pokerogue/battle-anims/${id}.json`)
      if (!response.ok) throw new Error(`Move animation unavailable: ${id}`)
      const raw = await response.json() as MoveAnimation | MoveAnimation[]
      const opponentVariant = Array.isArray(raw) && attacker === 'enemy' && raw.length > 1
      const data = Array.isArray(raw) ? raw[opponentVariant ? 1 : 0] : raw
      if (!data?.frames?.length) throw new Error(`Empty move animation: ${id}`)
      const backgrounds = new Map<string, HTMLImageElement>()
      const names = new Set(Object.values(data.frameTimedEvents ?? {}).flat()
        .filter(event => event.eventType === 'AnimTimedAddBgEvent' && event.resourceName)
        .map(event => event.resourceName))
      const [sheet] = await Promise.all([
        data.graphic ? loadBattleImage(`/pokerogue/images/battle_anims/${encodeURIComponent(data.graphic)}.png`) : null,
        ...Array.from(names, async name => backgrounds.set(name, await loadBattleImage(`/pokerogue/images/battle_anims/${encodeURIComponent(name)}.png`))),
      ])
      return { data, sheet, backgrounds, opponentVariant }
    })()
    animationCache.set(key, result)
    void result.catch(() => animationCache.delete(key))
  }
  return result
}

export function nativeSprite(context: CanvasRenderingContext2D, sprite: LoadedPokemonSprite, tick: number, x: number, y: number) {
  const frame = sprite.frames[tick % sprite.frames.length]
  drawPokemonSprite(context, sprite, tick, x, y, Math.max(frame.sourceSize.w, frame.sourceSize.h))
}

function tonedSprite(context: CanvasRenderingContext2D, sprite: LoadedPokemonSprite, tick: number, tone?: AnimFrame['tone']) {
  if (!tone?.some(value => value !== 0)) { nativeSprite(context, sprite, tick, 0, 0); return }
  const index = tick % sprite.frames.length
  const key = `${index}:${tone.join(',')}`
  let cache = tintCache.get(sprite)
  if (!cache) { cache = new Map(); tintCache.set(sprite, cache) }
  let bitmap = cache.get(key)
  if (!bitmap) {
    const source = sprite.frames[index].sourceSize
    bitmap = document.createElement('canvas')
    bitmap.width = source.w
    bitmap.height = source.h
    const surface = bitmap.getContext('2d')!
    nativeSprite(surface, sprite, tick, source.w / 2, source.h / 2)
    const pixels = surface.getImageData(0, 0, source.w, source.h)
    const gray = Math.max(0, Math.min(1, tone[3] / 255))
    for (let i = 0; i < pixels.data.length; i += 4) {
      const luma = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114
      for (let channel = 0; channel < 3; channel++) {
        pixels.data[i + channel] = pixels.data[i + channel] * (1 - gray) + luma * gray + tone[channel]
      }
    }
    surface.putImageData(pixels, 0, 0)
    if (cache.size >= 256) cache.clear()
    cache.set(key, bitmap)
  }
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
}

// The source reference line stays fixed even when the enemy is the attacker.
// Only the destination battlers change sides. Reversing both lines sends attacks off screen.
export function frameTransform(frame: AnimFrame, attacker: 'player' | 'enemy', sprites: LoadedPokemonSprite[]) {
  const user = attacker === 'player' ? 0 : 1
  const target = 1 - user
  const a = positions[attacker]
  const b = positions[attacker === 'player' ? 'enemy' : 'player']
  const ah = sprites[user].frames[0].sourceSize.h / 2
  const bh = sprites[target].frames[0].sourceSize.h / 2
  let x = frame.x + 106
  let y = frame.y + 116
  let sx = frame.zoomX / 100 * (frame.mirror ? -1 : 1)
  if (frame.focus === 1) { x += b.x - 234; y += b.y - bh - 52 }
  else if (frame.focus === 2) { x += a.x - 106; y += a.y - ah - 116 }
  else if (frame.focus === 3) {
    x = a.x + (x - 106) / 128 * (b.x - a.x)
    y = a.y - ah + (y - 116) / -64 * (b.y - bh - a.y + ah)
    if (frame.target === 2 && a.x > b.x) sx *= -1
  }
  return { x, y, sx, sy: frame.zoomY / 100, user, target }
}

export function paintMoveFrame(context: CanvasRenderingContext2D, loaded: LoadedMoveAnimation, frames: AnimFrame[], attacker: 'player' | 'enemy', sprites: LoadedPokemonSprite[], tick: number) {
  const layers = frames.map((frame, order) => ({ frame, order })).sort((a, b) => {
    const layer = (frame: AnimFrame) => frame.target !== 2 ? 1 : frame.priority === 0 || frame.priority === 2 ? 0 : 2
    return layer(a.frame) - layer(b.frame) || a.order - b.order
  })
  for (const { frame } of layers) {
    if (!frame.visible || frame.opacity <= 0) continue
    const { x, y, sx, sy, user, target } = frameTransform(frame, attacker, sprites)
    context.save()
    context.translate(x, y)
    context.rotate(-(frame.angle ?? 0) * Math.PI / 180)
    context.scale(sx, sy)
    context.globalAlpha = Math.max(0, Math.min(1, frame.opacity / 255))
    context.globalCompositeOperation = frame.blendType === 1 ? 'lighter' : frame.blendType === 2 ? 'difference' : 'source-over'
    if (frame.target === 2 && loaded.sheet) {
      const columns = Math.max(1, Math.floor(loaded.sheet.width / 96))
      context.drawImage(loaded.sheet, frame.graphicFrame % columns * 96, Math.floor(frame.graphicFrame / columns) * 96, 96, 96, -48, -48, 96, 96)
    } else if (frame.target !== 2) {
      const sprite = sprites[frame.target === 0 ? user : target]
      tonedSprite(context, sprite, tick, frame.tone)
    }
    context.restore()
  }
}

export function paintMoveBackground(context: CanvasRenderingContext2D, loaded: LoadedMoveAnimation, elapsed: number) {
  let background: { image?: HTMLImageElement; x: number; y: number; opacity: number } | null = null
  for (const [key, events] of Object.entries(loaded.data.frameTimedEvents ?? {}).sort(([a], [b]) => Number(a) - Number(b))) {
    const eventTime = Number(key) * MOVE_FRAME_MS
    if (eventTime > elapsed) break
    for (const event of events) {
      if (event.eventType === 'AnimTimedAddBgEvent') {
        background = { image: loaded.backgrounds.get(event.resourceName), x: (event.bgX ?? 0) - 320, y: (event.bgY ?? 0) - 284, opacity: (event.opacity ?? 0) / 255 }
      } else if (background && event.eventType === 'AnimTimedUpdateBgEvent') {
        const progress = Math.min(1, (elapsed - eventTime) / Math.max(1, (event.duration ?? 0) * MOVE_FRAME_MS))
        if (event.opacity !== undefined) background.opacity += (event.opacity / 255 - background.opacity) * progress
        if (event.bgX !== undefined) background.x += (event.bgX * .5 - 320 - background.x) * progress
        if (event.bgY !== undefined) background.y += (event.bgY * .5 - 284 - background.y) * progress
      }
    }
  }
  if (!background) return
  context.save()
  context.globalAlpha = background.opacity
  context.translate(background.x, background.y)
  context.scale(1.25, 1.25)
  context.fillStyle = background.image ? context.createPattern(background.image, 'repeat') ?? '#000' : '#000'
  context.fillRect(0, 0, 896, 576)
  context.restore()
}
