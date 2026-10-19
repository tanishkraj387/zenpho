import { useEffect, useRef } from 'react'
import { useAudioStore } from '../../lib/audio'
import { drawPokemonSprite, loadPokemonSprite, pokemonIdFromSpriteUrl } from '../../lib/pokeroguePokemonSprites'

type AnimationFrame = {
  x: number
  y: number
  zoomX: number
  zoomY: number
  visible: boolean
  target: number
  graphicFrame: number
  opacity: number
  priority?: number
  focus: number
  angle?: number
  mirror?: boolean
  blendType?: number
  tone?: [number, number, number, number]
}

type AnimationData = {
  graphic: string
  frames: AnimationFrame[][]
  frameTimedEvents?: Record<string, { eventType: string; resourceName: string; volume?: number; pitch?: number }[]>
}

const frameSize = 96
const frameDuration = 50
const sourceUser = { x: 106, y: 116 }
const sourceTarget = { x: 234, y: 52 }
const stageUser = { x: 72, y: 128 }
const stageTarget = { x: 248, y: 60 }

function transformedPoint(frame: AnimationFrame, attacker: 'player' | 'enemy') {
  const sourceAttacker = attacker === 'player' ? sourceUser : sourceTarget
  const sourceDefender = attacker === 'player' ? sourceTarget : sourceUser
  const stageAttacker = attacker === 'player' ? stageUser : stageTarget
  const stageDefender = attacker === 'player' ? stageTarget : stageUser
  let x = frame.x + 106
  let y = frame.y + 116

  if (frame.focus === 2) {
    x += stageAttacker.x - sourceAttacker.x
    y += stageAttacker.y - 32 - sourceAttacker.y
  } else if (frame.focus === 1) {
    x += stageDefender.x - sourceDefender.x
    y += stageDefender.y - 32 - sourceDefender.y
  } else if (frame.focus === 3) {
    const t = (x - sourceAttacker.x) / (sourceDefender.x - sourceAttacker.x)
    y = stageAttacker.y - 32 + (y - sourceAttacker.y) / (sourceDefender.y - sourceAttacker.y) * (stageDefender.y - 32 - (stageAttacker.y - 32))
    x = stageAttacker.x + t * (stageDefender.x - stageAttacker.x)
  }

  return { x, y }
}

export function BattleMoveAnimation({
  animationId,
  attacker,
  playerSprite,
  enemySprite,
  onComplete,
}: {
  animationId: string
  attacker: 'player' | 'enemy'
  playerSprite: string
  enemySprite: string
  onComplete: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playBattleCue = useAudioStore((state) => state.playBattleCue)

  useEffect(() => {
    let cancelled = false
    let interval: number | undefined
    let fallback: number | undefined
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      onComplete()
      return
    }

    const finish = () => {
      if (cancelled) return
      window.clearInterval(interval)
      onComplete()
    }

    const run = async () => {
      try {
        const response = await fetch(`/pokerogue/battle-anims/${animationId}.json`)
        if (!response.ok) throw new Error('Animation data unavailable')
        const animation = await response.json() as AnimationData
        const graphic = Array.isArray(animation.graphic) ? animation.graphic[0] : animation.graphic
        const image = new Image()
        image.src = `/pokerogue/images/battle_anims/${encodeURIComponent(graphic)}.png`
        await image.decode()
        const pokemonImages = await Promise.all([playerSprite, enemySprite].map(async (src) => {
          const id = pokemonIdFromSpriteUrl(src)
          if (id === null) throw new Error('PokéRogue sprite URL is invalid')
          const pokemon = await loadPokemonSprite(id)
          const canvasFrames = pokemon.frames.filter((spriteFrame) => {
            const spriteFrameNumber = Number.parseInt(spriteFrame.filename, 10)
            return spriteFrameNumber >= 1 && spriteFrameNumber <= 16
          })
          const frames = canvasFrames.length ? canvasFrames : [pokemon.frames[0]]
          return frames.map((_, frameIndex) => {
            const frameCanvas = document.createElement('canvas')
            frameCanvas.width = 128
            frameCanvas.height = 128
            const frameContext = frameCanvas.getContext('2d')
            if (frameContext) {
              frameContext.imageSmoothingEnabled = false
              drawPokemonSprite(frameContext, { ...pokemon, frames }, frameIndex, 64, 64, 112, src.endsWith('#back'))
            }
            return frameCanvas
          })
        }))
        if (cancelled) return
        const toneCanvas = document.createElement('canvas')
        toneCanvas.width = 128
        toneCanvas.height = 128
        const toneContext = toneCanvas.getContext('2d')

        const width = canvas.clientWidth
        const height = canvas.clientHeight
        const scaleX = width / 320
        const scaleY = height / 180
        canvas.width = Math.round(width * window.devicePixelRatio)
        canvas.height = Math.round(height * window.devicePixelRatio)
        context.setTransform(window.devicePixelRatio * scaleX, 0, 0, window.devicePixelRatio * scaleY, 0, 0)
        const columns = Math.max(1, Math.floor(image.naturalWidth / frameSize))
        context.imageSmoothingEnabled = false
        let frameIndex = 0

        const paint = (index: number) => {
          context.clearRect(0, 0, 320, 180)
          const elements = animation.frames[index] ?? []
          const drawPokemonFrame = (frame: AnimationFrame) => {
            const point = transformedPoint(frame, attacker)
            const sources = frame.target === 0
              ? (attacker === 'player' ? pokemonImages[0] : pokemonImages[1])
              : (attacker === 'player' ? pokemonImages[1] : pokemonImages[0])
            const source = sources[index % sources.length]
            const size = frame.target === 0
              ? (attacker === 'player' ? 92 : 78)
              : (attacker === 'player' ? 78 : 92)
            const scaleX = Math.min(1.25, Math.max(0.25, frame.zoomX / 100))
            const scaleY = Math.min(1.25, Math.max(0.25, frame.zoomY / 100))
            const x = Math.max(size * scaleX / 2, Math.min(320 - size * scaleX / 2, point.x))
            const y = Math.max(size * scaleY / 2, Math.min(180 - size * scaleY / 2, point.y))
            let bitmap: CanvasImageSource = source
            if (frame.tone && toneContext) {
              const [red, green, blue, gray] = frame.tone
              toneContext.clearRect(0, 0, 128, 128)
              toneContext.filter = gray > 0 ? `grayscale(${Math.min(1, gray / 255)})` : 'none'
              toneContext.globalCompositeOperation = 'source-over'
              toneContext.drawImage(source, 0, 0, 128, 128)
              toneContext.filter = 'none'
              toneContext.globalCompositeOperation = 'source-atop'
              const alpha = Math.max(red, green, blue) / 255
              toneContext.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`
              toneContext.fillRect(0, 0, 128, 128)
              bitmap = toneCanvas
            }
            context.save()
            context.globalAlpha = Math.max(0, Math.min(1, frame.opacity / 255))
            context.globalCompositeOperation = frame.blendType === 1 ? 'lighter' : frame.blendType === 2 ? 'difference' : 'source-over'
            context.translate(x, y)
            context.rotate((-(frame.angle ?? 0) * Math.PI) / 180)
            context.scale(scaleX * (frame.mirror ? -1 : 1), scaleY)
            context.drawImage(bitmap, -size / 2, -size / 2, size, size)
            context.restore()
          }
          const drawGraphicFrame = (frame: AnimationFrame) => {
            const { x, y } = transformedPoint(frame, attacker)
            const sx = (frame.graphicFrame % columns) * frameSize
            const sy = Math.floor(frame.graphicFrame / columns) * frameSize
            const scaleX = (frame.zoomX / 100) * (frame.mirror ? -1 : 1)
            const scaleY = frame.zoomY / 100
            context.save()
            context.globalAlpha = Math.max(0, Math.min(1, frame.opacity / 255))
            context.globalCompositeOperation = frame.blendType === 1 ? 'lighter' : frame.blendType === 2 ? 'difference' : 'source-over'
            context.translate(x, y)
            context.rotate((-(frame.angle ?? 0) * Math.PI) / 180)
            context.scale(scaleX, scaleY)
            context.drawImage(image, sx, sy, frameSize, frameSize, -frameSize / 2, -frameSize / 2, frameSize, frameSize)
            context.restore()
          }
          for (const frame of elements) {
            if (frame.visible && frame.target === 2 && (frame.priority === 0 || frame.priority === 2)) {
              drawGraphicFrame(frame)
            }
          }
          for (const frame of elements) {
            if (frame.visible && (frame.target === 0 || frame.target === 1)) drawPokemonFrame(frame)
          }
          for (const frame of elements) {
            if (frame.visible && frame.target === 2 && frame.priority !== 0 && frame.priority !== 2) {
              drawGraphicFrame(frame)
            }
          }
          for (const event of animation.frameTimedEvents?.[String(index)] ?? []) {
            if (event.eventType === 'AnimTimedSoundEvent') {
              playBattleCue(event.resourceName, event.volume ?? 100, event.pitch ?? 100)
            }
          }
        }

        paint(frameIndex)
        interval = window.setInterval(() => {
          frameIndex += 1
          if (frameIndex >= animation.frames.length) {
            finish()
            return
          }
          paint(frameIndex)
        }, frameDuration)
      } catch {
        if (cancelled) return
        fallback = window.setTimeout(finish, 850)
      }
    }

    void run()
    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.clearTimeout(fallback)
    }
  }, [animationId, attacker, enemySprite, onComplete, playerSprite, playBattleCue])

  return <canvas aria-hidden="true" className="battle-move-animation" ref={canvasRef} />
}
