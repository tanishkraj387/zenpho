import { useEffect, useRef, type CanvasHTMLAttributes } from 'react'
import { drawPokemonSprite, loadPokemonSprite } from '../../lib/pokeroguePokemonSprites'
import type { SpriteType } from '../../lib/sprites'

type SpriteProps = Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'id' | 'width' | 'height'> & {
  alt?: string
  id: number
  type: SpriteType
}

export function Sprite({ alt, className = '', id, type, ...props }: SpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let stopped = false
    let frameIndex = 0
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    canvas.width = 96
    canvas.height = 96
    context.imageSmoothingEnabled = false
    const draw = async () => {
      try {
        const sprite = await loadPokemonSprite(id)
        if (stopped) return
        const idleFrames = sprite.frames.filter((frame) => {
          const frameNumber = Number.parseInt(frame.filename, 10)
          return frameNumber >= 1 && frameNumber <= 16
        })
        const frames = idleFrames.length ? idleFrames : [sprite.frames[0]]
        const paint = () => {
          if (stopped) return
          context.clearRect(0, 0, canvas.width, canvas.height)
          drawPokemonSprite(context, { ...sprite, frames }, frameIndex++, 48, 48, 82, type === 'back')
        }
        paint()
        const timer = window.setInterval(paint, 100)
        return () => window.clearInterval(timer)
      } catch {
        canvas.setAttribute('data-sprite-error', 'true')
      }
    }

    let stopTimer: (() => void) | undefined
    void draw().then((stop) => { stopTimer = stop })
    return () => {
      stopped = true
      stopTimer?.()
    }
  }, [id, type])

  return (
    <canvas
      aria-label={alt ?? `${type} PokéRogue sprite for Pokémon ${id}`}
      className={['sprite-image', className].join(' ')}
      height={96}
      ref={canvasRef}
      role="img"
      width={96}
      {...props}
    />
  )
}
