import type { ItemSpriteName } from './sprites'
import { isSupabaseConfigured, supabase } from './supabase'

export type ShopCategory = 'balls' | 'healing' | 'special'

export type ShopItem = {
  id: ItemSpriteName
  itemKey: string
  name: string
  category: ShopCategory
  price: number
  owned: number
  description: string
  effect: string
}

export type ShopSummary = {
  coins: number
  energy: number
  maxEnergy: number
  items: ShopItem[]
}

const fallbackItems: ShopItem[] = [
  {
    id: 'poke-ball',
    itemKey: 'poke-ball',
    name: 'Poke Ball',
    category: 'balls',
    price: 20,
    owned: 0,
    description: 'Basic ball for common encounters.',
    effect: 'Small catch bonus',
  },
  {
    id: 'great-ball',
    itemKey: 'great-ball',
    name: 'Great Ball',
    category: 'balls',
    price: 45,
    owned: 0,
    description: 'Better odds for uncommon and rare encounters.',
    effect: 'Medium catch bonus',
  },
  {
    id: 'ultra-ball',
    itemKey: 'ultra-ball',
    name: 'Ultra Ball',
    category: 'balls',
    price: 90,
    owned: 0,
    description: 'Strong choice for hard route encounters.',
    effect: 'Large catch bonus',
  },
  {
    id: 'master-ball',
    itemKey: 'master-ball',
    name: 'Master Ball',
    category: 'special',
    price: 999,
    owned: 0,
    description: 'Rare guaranteed catch item.',
    effect: 'Guaranteed catch',
  },
  {
    id: 'potion',
    itemKey: 'potion',
    name: 'Potion',
    category: 'healing',
    price: 25,
    owned: 0,
    description: 'Restores a small amount of HP during battle.',
    effect: 'Restore 25 HP',
  },
  {
    id: 'super-potion',
    itemKey: 'super-potion',
    name: 'Super Potion',
    category: 'healing',
    price: 55,
    owned: 0,
    description: 'Useful when a route is draining HP quickly.',
    effect: 'Restore 50 HP',
  },
  {
    id: 'revive',
    itemKey: 'revive',
    name: 'Revive',
    category: 'healing',
    price: 80,
    owned: 0,
    description: 'Brings the trainer back after a defeat state.',
    effect: 'Recover from 0 HP',
  },
  {
    id: 'rare-candy',
    itemKey: 'rare-candy',
    name: 'Rare Candy',
    category: 'special',
    price: 140,
    owned: 0,
    description: 'Future bond and XP booster for party Pokemon.',
    effect: 'Future XP boost',
  },
]

function describeItem(effect: string) {
  if (effect.toLowerCase().includes('catch')) {
    return 'Improves catch readiness after solving an encounter.'
  }

  if (effect.toLowerCase().includes('hp') || effect.toLowerCase().includes('recover')) {
    return 'Helps recover during longer coding battles.'
  }

  return 'Special item for future progression systems.'
}

export async function getShopSummary(userId: string): Promise<ShopSummary> {
  if (!isSupabaseConfigured) {
    return {
      coins: 245,
      energy: 37,
      maxEnergy: 50,
      items: fallbackItems,
    }
  }

  const [resourcesResult, itemResult, inventoryResult] = await Promise.all([
    supabase
      .from('player_resources')
      .select('coins,energy,max_energy')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('inventory_items')
      .select('item_key,display_name,category,price,effect,sprite_name')
      .eq('is_active', true)
      .order('price', { ascending: true }),
    supabase
      .from('player_inventory')
      .select('item_key,quantity')
      .eq('user_id', userId),
  ])

  if (resourcesResult.error) {
    throw resourcesResult.error
  }

  if (itemResult.error) {
    throw itemResult.error
  }

  if (inventoryResult.error) {
    throw inventoryResult.error
  }

  const quantities = new Map(
    inventoryResult.data?.map((item) => [item.item_key, item.quantity]) ?? [],
  )

  return {
    coins: resourcesResult.data?.coins ?? 0,
    energy: resourcesResult.data?.energy ?? 0,
    maxEnergy: resourcesResult.data?.max_energy ?? 50,
    items:
      itemResult.data?.map((item) => ({
        id: item.sprite_name as ItemSpriteName,
        itemKey: item.item_key,
        name: item.display_name,
        category: item.category as ShopCategory,
        price: item.price,
        owned: quantities.get(item.item_key) ?? 0,
        description: describeItem(item.effect),
        effect: item.effect,
      })) ?? fallbackItems,
  }
}

export async function buyShopItem(itemKey: string) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.rpc('buy_item', {
    p_item_key: itemKey,
  })

  if (error) {
    throw error
  }

  return data
}
