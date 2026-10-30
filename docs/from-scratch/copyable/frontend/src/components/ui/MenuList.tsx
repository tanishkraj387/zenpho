import { useState } from 'react'

export type MenuItem = {
  id: string
  label: string
  disabled?: boolean
}

type MenuListProps = {
  items: MenuItem[]
  onSelect: (item: MenuItem) => void
  label?: string
}

export function MenuList({ items, label = 'Menu options', onSelect }: MenuListProps) {
  const firstEnabled = Math.max(0, items.findIndex((item) => !item.disabled))
  const [highlightedIndex, setHighlightedIndex] = useState(firstEnabled)

  function moveHighlight(direction: 1 | -1) {
    if (items.length === 0) {
      return
    }

    let nextIndex = highlightedIndex

    for (let step = 0; step < items.length; step += 1) {
      nextIndex = (nextIndex + direction + items.length) % items.length

      if (!items[nextIndex].disabled) {
        setHighlightedIndex(nextIndex)
        return
      }
    }
  }

  function selectItem(index: number) {
    const item = items[index]

    if (item && !item.disabled) {
      setHighlightedIndex(index)
      onSelect(item)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveHighlight(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlight(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      selectItem(highlightedIndex)
    }
  }

  return (
    <div
      aria-label={label}
      className="pixel-focus border-4 border-ink bg-cream p-2"
      onKeyDown={handleKeyDown}
      role="menu"
      tabIndex={0}
    >
      {items.map((item, index) => (
        <button
          aria-disabled={item.disabled}
          className={[
            'pixel-focus flex w-full items-center gap-3 px-3 py-2 text-left font-heading text-xs uppercase',
            item.disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-warning',
          ].join(' ')}
          key={item.id}
          onClick={() => selectItem(index)}
          onMouseEnter={() => {
            if (!item.disabled) {
              setHighlightedIndex(index)
            }
          }}
          role="menuitem"
          type="button"
        >
          <span aria-hidden="true" className="w-4">
            {highlightedIndex === index ? '▶' : ''}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
