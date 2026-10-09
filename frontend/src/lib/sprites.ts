export const spriteTypes = ['front', 'back', 'shiny', 'icon'] as const

export type SpriteType = (typeof spriteTypes)[number]

export const itemSpriteNames = [
  'potion',
  'super-potion',
  'hyper-potion',
  'max-potion',
  'revive',
  'max-revive',
  'poke-ball',
  'great-ball',
  'ultra-ball',
  'master-ball',
  'rare-candy',
] as const

export type ItemSpriteName = (typeof itemSpriteNames)[number]

export function getSprite(id: number, type: SpriteType) {
  if (type === 'icon') {
    return `/sprites/icons/${id}.png`
  }

  return `/sprites/battle/${type}/${id}.gif`
}

export function getItemSprite(name: ItemSpriteName) {
  return `/sprites/items/${name}.png`
}
