import { useMemo, useState } from 'react'
import { DialogBox } from '../components/ui/DialogBox'
import { HPBar } from '../components/ui/HPBar'
import { MenuList, type MenuItem } from '../components/ui/MenuList'
import { Modal } from '../components/ui/Modal'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import { TypeBadge, type TopicType } from '../components/ui/TypeBadge'
import { XPBar } from '../components/ui/XPBar'

const dialogMessages = [
  'A wild bug appeared in your code!',
  'Choose a strategy and keep your syntax steady.',
  'Critical thinking is super effective!',
]

const menuItems: MenuItem[] = [
  { id: 'attack', label: 'Attack' },
  { id: 'practice', label: 'Practice' },
  { id: 'bag', label: 'Bag' },
  { id: 'locked', label: 'Locked', disabled: true },
]

const topicTypes: TopicType[] = ['Arrays', 'Strings', 'Graphs', 'Trees', 'DP', 'Math']

export function UiDemo() {
  const [hp, setHp] = useState(88)
  const [dialogIndex, setDialogIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMenuItem, setSelectedMenuItem] = useState('None')

  const dialogText = useMemo(() => dialogMessages[dialogIndex], [dialogIndex])

  function toggleHp() {
    setHp((current) => (current > 25 ? 18 : 88))
  }

  function nextDialog() {
    setDialogIndex((current) => (current + 1) % dialogMessages.length)
  }

  return (
    <main className="min-h-screen bg-sky px-6 py-8 font-pixel text-ink">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="font-heading text-2xl leading-relaxed">Pixel UI Demo</h1>
          <p className="mt-3 max-w-3xl text-2xl">
            A compact look-and-feel pass for battle screens, menus, dialogs, and
            feedback panels.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <PixelCard title="Buttons">
            <div className="flex flex-wrap gap-4">
              <PixelButton>Primary</PixelButton>
              <PixelButton variant="secondary">Secondary</PixelButton>
              <PixelButton variant="danger">Danger</PixelButton>
              <PixelButton disabled>Disabled</PixelButton>
            </div>
          </PixelCard>

          <PixelCard title="Badges">
            <div className="flex flex-wrap gap-3">
              {topicTypes.map((type) => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          </PixelCard>

          <PixelCard title="XP">
            <XPBar current={64} max={100} />
          </PixelCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <PixelCard title="Battle Preview">
            <div className="grid gap-6 md:grid-cols-[160px_1fr] md:items-end">
              <div className="border-4 border-ink bg-grass p-4 text-center">
                <Sprite className="mx-auto h-28 w-28 object-contain" id={25} type="front" />
              </div>
              <div className="space-y-4">
                <HPBar current={hp} label="Pikachu" level={12} max={100} />
                <PixelButton onClick={toggleHp} variant="secondary">
                  Drain / Refill HP
                </PixelButton>
              </div>
            </div>
          </PixelCard>

          <PixelCard title="Menu">
            <MenuList
              items={menuItems}
              onSelect={(item) => {
                setSelectedMenuItem(item.label)
              }}
            />
            <p className="mt-4 text-xl">Selected: {selectedMenuItem}</p>
          </PixelCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <DialogBox text={dialogText} />
            <PixelButton onClick={nextDialog}>New Dialog Message</PixelButton>
          </div>

          <PixelCard title="Modal">
            <p className="mb-4 text-xl">Opens a trapped-focus dialog with Escape support.</p>
            <PixelButton onClick={() => setIsModalOpen(true)} variant="secondary">
              Open Modal
            </PixelButton>
          </PixelCard>
        </section>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Pause Menu"
      >
        <p className="text-xl">Focus stays in this panel until you close it.</p>
        <PixelButton>Resume</PixelButton>
      </Modal>
    </main>
  )
}
