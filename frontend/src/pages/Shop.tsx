import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AppHeader } from '../components/auth/AppHeader'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { XPBar } from '../components/ui/XPBar'
import { useShopSummary } from '../hooks/useShopSummary'
import { buyShopItem, type ShopCategory, type ShopItem } from '../lib/shop'
import { getItemSprite } from '../lib/sprites'

const categoryLabels: Record<ShopCategory | 'all', string> = {
  all: 'All',
  balls: 'Balls',
  healing: 'Healing',
  special: 'Special',
}

function getCategoryClass(category: ShopCategory) {
  if (category === 'balls') {
    return 'bg-grass text-cream'
  }

  if (category === 'healing') {
    return 'bg-danger text-cream'
  }

  return 'bg-warning text-ink'
}

export function Shop() {
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState<ShopCategory | 'all'>('all')
  const [pendingItemKey, setPendingItemKey] = useState<string | null>(null)
  const [purchaseMessage, setPurchaseMessage] = useState('')
  const shopSummary = useShopSummary()
  const summary = shopSummary.data
  const coins = summary?.coins ?? 0
  const energy = {
    current: summary?.energy ?? 0,
    max: summary?.maxEnergy ?? 50,
  }
  const shopItems = summary?.items ?? []
  const message = shopSummary.isError
    ? 'Shop is using empty fallback data until Supabase shop tables are reachable.'
    : purchaseMessage || 'Inventory, purchases, and balances are controlled by Supabase.'

  const filteredItems = useMemo(
    () =>
      activeCategory === 'all'
        ? shopItems
        : shopItems.filter((item) => item.category === activeCategory),
    [activeCategory],
  )

  async function buyItem(item: ShopItem) {
    setPurchaseMessage('')
    setPendingItemKey(item.itemKey)

    try {
      await buyShopItem(item.itemKey)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shop-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['player-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['milestones'] }),
      ])
      setPurchaseMessage(`Bought 1 ${item.name}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase failed.'
      setPurchaseMessage(message)
    } finally {
      setPendingItemKey(null)
    }
  }

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={coins} />
      <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <PixelCard bodyClassName="p-4 sm:p-5" title="Shop">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Trainer Mart
              </p>
              <h1 className="font-heading text-2xl leading-relaxed sm:text-3xl">
                Stock up before the next route
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed">
                Spend coins on balls and battle items. The backend owns
                inventory, purchases, and balances.
              </p>
            </div>
            <Link to="/hub">
              <PixelButton className="w-full sm:w-auto" variant="secondary">
                Back to Hub
              </PixelButton>
            </Link>
          </div>
        </PixelCard>

        <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <PixelCard bodyClassName="space-y-4 p-4" title="Wallet">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <article className="border-4 border-ink bg-white p-4 shadow-[4px_4px_0_#1a1c2c]">
                <p className="font-heading text-[10px] uppercase">Coins</p>
                <p className="mt-2 font-heading text-2xl">{coins}</p>
                <p className="mt-2 text-xl">Earned by solving questions.</p>
              </article>
              <article className="border-4 border-ink bg-white p-4 shadow-[4px_4px_0_#1a1c2c]">
                <XPBar current={energy.current} label="Energy" max={energy.max} />
                <p className="mt-3 text-xl">
                  Energy drains from runs, submits, and harder encounters.
                </p>
              </article>
            </div>
            <div className="border-4 border-ink bg-warning p-3 text-xl" role="status">
              {message}
            </div>
          </PixelCard>

          <PixelCard bodyClassName="space-y-4 p-4 sm:p-5" title="Inventory">
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              {(['all', 'balls', 'healing', 'special'] as const).map((category) => (
                <PixelButton
                  className="min-h-12 px-3 py-2"
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  variant={activeCategory === category ? 'primary' : 'secondary'}
                >
                  {categoryLabels[category]}
                </PixelButton>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const canAfford = coins >= item.price
                const isBuying = pendingItemKey === item.itemKey

                return (
                  <article
                    className="flex min-h-[260px] flex-col border-4 border-ink bg-cream p-4 shadow-[6px_6px_0_#1a1c2c]"
                    key={item.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`inline-block border-4 border-ink px-2 py-1 font-heading text-[9px] uppercase ${getCategoryClass(
                            item.category,
                          )}`}
                        >
                          {categoryLabels[item.category]}
                        </p>
                        <h2 className="mt-3 font-heading text-xs leading-relaxed">
                          {item.name}
                        </h2>
                      </div>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center border-4 border-ink bg-white">
                        <img
                          alt={`${item.name} sprite`}
                          className="sprite-image h-12 w-12 object-contain"
                          src={getItemSprite(item.id)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-lg">
                      <p>{item.description}</p>
                      <p>
                        <span className="font-heading text-[9px] uppercase">Effect</span>
                        <br />
                        {item.effect}
                      </p>
                      <p>
                        <span className="font-heading text-[9px] uppercase">Owned</span>
                        <br />
                        x{item.owned}
                      </p>
                    </div>

                    <div className="mt-auto grid gap-3 pt-4">
                      <p className="font-heading text-xs">{item.price} coins</p>
                      <PixelButton
                        disabled={!canAfford || isBuying}
                        onClick={() => buyItem(item)}
                        variant={canAfford ? 'primary' : 'secondary'}
                      >
                        {isBuying ? 'Buying...' : 'Buy'}
                      </PixelButton>
                    </div>
                  </article>
                )
              })}
            </div>
          </PixelCard>
        </div>
      </section>
    </main>
  )
}
