import type { ImgHTMLAttributes } from 'react'
import { getSprite, type SpriteType } from '../../lib/sprites'

type SpriteProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'id' | 'src'> & {
  id: number
  type: SpriteType
}

export function Sprite({ alt, className = '', id, type, ...props }: SpriteProps) {
  return (
    <img
      alt={alt ?? `${type} sprite for Pokemon ${id}`}
      className={['sprite-image', className].join(' ')}
      src={getSprite(id, type)}
      {...props}
    />
  )
}
