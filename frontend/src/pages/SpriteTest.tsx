import spriteIds from '../../sprite-ids.json'
import { getItemSprite, getSprite, itemSpriteNames, spriteTypes } from '../lib/sprites'

export function SpriteTest() {
  return (
    <main className="min-h-screen bg-white px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">Sprite Test</h1>

        <section className="mt-8">
          <h2 className="text-xl font-semibold">Pokemon</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {spriteIds.map((id) => (
              <article key={id} className="rounded border border-slate-200 p-4">
                <div className="grid grid-cols-4 items-end gap-3">
                  {spriteTypes.map((type) => (
                    <div key={type} className="text-center">
                      <img
                        alt={`${type} sprite for Pokemon ${id}`}
                        className="sprite-image mx-auto max-h-24 object-contain"
                        src={getSprite(id, type)}
                      />
                      <div className="mt-2 text-xs text-slate-500">{type}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-center text-sm font-medium">#{id}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Items</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {itemSpriteNames.map((name) => (
              <article
                key={name}
                className="flex w-32 flex-col items-center justify-end rounded border border-slate-200 p-4 text-center"
              >
                <img
                  alt={`${name} sprite`}
                  className="sprite-image max-h-12 object-contain"
                  src={getItemSprite(name)}
                />
                <div className="mt-3 text-xs font-medium capitalize text-slate-600">
                  {name.replaceAll('-', ' ')}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
