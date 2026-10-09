import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useState } from 'react'
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from 'react-resizable-panels'
import { useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { DialogBox } from '../components/ui/DialogBox'
import { HPBar } from '../components/ui/HPBar'
import { Modal } from '../components/ui/Modal'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import { TypeBadge, type TopicType as BadgeTopicType } from '../components/ui/TypeBadge'
import { XPBar } from '../components/ui/XPBar'
import {
  getEncounterForQuestion,
  getQuestionHints,
  getQuestionById,
  getTopicLabel,
  type CodeLanguage,
} from '../lib/questions'
import { getItemSprite, type ItemSpriteName } from '../lib/sprites'
import { mockJudge } from '../mocks/mockJudge'
import { type JudgeOutcome, useBattleStore } from '../store/battleStore'

type BallItem = {
  id: Extract<ItemSpriteName, 'poke-ball' | 'great-ball' | 'ultra-ball' | 'master-ball'>
  label: string
  count: number
  bonus: number
}

type CatchPhase = 'idle' | 'choosing' | 'throwing' | 'shaking' | 'success' | 'breakout'

const ballItems: BallItem[] = [
  { id: 'poke-ball', label: 'Poke Ball', count: 8, bonus: 12 },
  { id: 'great-ball', label: 'Great Ball', count: 4, bonus: 24 },
  { id: 'ultra-ball', label: 'Ultra Ball', count: 2, bonus: 36 },
  { id: 'master-ball', label: 'Master Ball', count: 1, bonus: 100 },
]

function resultClass(state: 'pending' | 'passed' | 'failed') {
  if (state === 'passed') {
    return 'bg-hp-green text-cream'
  }

  if (state === 'failed') {
    return 'bg-danger text-cream'
  }

  return 'bg-warning text-ink'
}

function animationClass(target: 'player' | 'enemy', animation: string) {
  if (target === 'player') {
    if (animation === 'player-lunge') {
      return 'translate-x-6 -translate-y-2'
    }

    if (animation === 'player-hit') {
      return 'animate-pulse'
    }
  }

  if (animation === 'enemy-lunge') {
    return '-translate-x-6 translate-y-2'
  }

  if (animation === 'enemy-hit') {
    return 'animate-pulse'
  }

  if (animation === 'enemy-faint') {
    return 'translate-y-16 opacity-0'
  }

  return ''
}

function useNarrowLayout() {
  const [isNarrow, setIsNarrow] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(max-width: 899px)')
    const update = () => setIsNarrow(query.matches)

    update()
    query.addEventListener('change', update)

    return () => query.removeEventListener('change', update)
  }, [])

  return isNarrow
}

export function Battle() {
  const [searchParams] = useSearchParams()
  const selectedQuestion = getQuestionById(searchParams.get('question') ?? '')
  const encounter = getEncounterForQuestion(
    selectedQuestion ?? getQuestionById('medium-arrays-longest-streak')!,
  )
  const topicBadge = getTopicLabel(encounter.question.topic) as BadgeTopicType
  const questionHints = getQuestionHints(encounter.question)
  const openingDialog = `A wild ${encounter.pokemon.name} appeared on ${encounter.routeName}!`
  const [language, setLanguage] = useState<CodeLanguage>('python')
  const [code, setCode] = useState(encounter.question.starterCode.python)
  const [isBagOpen, setIsBagOpen] = useState(false)
  const [isBattleCollapsed, setIsBattleCollapsed] = useState(false)
  const [activeProblemTab, setActiveProblemTab] = useState<'description' | 'hints'>('description')
  const [activeResultTab, setActiveResultTab] = useState<'results' | 'log'>('results')
  const [isDevOpen, setIsDevOpen] = useState(false)
  const [isOutcomeModalDismissed, setIsOutcomeModalDismissed] = useState(false)
  const [catchPhase, setCatchPhase] = useState<CatchPhase>('idle')
  const [selectedBall, setSelectedBall] = useState<BallItem | null>(null)
  const [battleLog, setBattleLog] = useState<string[]>([
    `A wild ${encounter.pokemon.name} appeared on ${encounter.routeName}!`,
  ])
  const isNarrow = useNarrowLayout()
  const resultsPanelRef = usePanelRef()
  const mainLayout = useDefaultLayout({
    id: 'battle-main-horizontal-v2',
    panelIds: ['problem', 'editor'],
  })
  const editorLayout = useDefaultLayout({
    id: 'battle-editor-vertical-v2',
    panelIds: ['code', 'results'],
  })
  const {
    animation,
    dialogText,
    enemyHp,
    enemyMaxHp,
    enqueueEvents,
    phase,
    playerHp,
    playerMaxHp,
    resetBattle,
    setJudging,
    tests,
    useBagItem,
    victoryRewards,
  } = useBattleStore()

  const isLocked = phase === 'judging' || phase === 'animating'

  useEffect(() => {
    if (phase === 'judging' || phase === 'animating' || phase === 'thinking') {
      setIsOutcomeModalDismissed(false)
    }
  }, [phase])

  useEffect(() => {
    setBattleLog((current) => {
      if (current[current.length - 1] === dialogText) {
        return current
      }

      return [...current.slice(-24), dialogText]
    })
  }, [dialogText])

  function openResultsDrawer() {
    setActiveResultTab('results')
    resultsPanelRef.current?.expand()
  }

  function simulate(outcome: JudgeOutcome) {
    if (isLocked) {
      return
    }

    openResultsDrawer()
    setJudging()
    window.setTimeout(() => {
      const result = mockJudge(outcome, {
        difficulty: encounter.question.difficulty,
        pokemonName: encounter.pokemon.name,
        topicLabel: getTopicLabel(encounter.question.topic),
      })
      enqueueEvents(result.events, result.tests)
    }, 350)
  }

  useEffect(() => {
    resetBattle(openingDialog)
    setCode(encounter.question.starterCode[language])
    setBattleLog([openingDialog])
    setCatchPhase('idle')
    setSelectedBall(null)
  }, [
    encounter.question.id,
    encounter.question.starterCode,
    language,
    openingDialog,
    resetBattle,
  ])

  function updateLanguage(nextLanguage: CodeLanguage) {
    setLanguage(nextLanguage)
    setCode(encounter.question.starterCode[nextLanguage])
  }

  const resultRows = useMemo(
    () =>
      tests.map((test) => (
        <div
          className="flex items-center justify-between border-4 border-ink bg-white p-2"
          key={test.id}
        >
          <span className="font-heading text-[10px]">{test.label}</span>
          <span
            className={`border-4 border-ink px-2 py-1 font-heading text-[10px] ${resultClass(
              test.state,
            )}`}
          >
            {test.state}
          </span>
        </div>
      )),
    [tests],
  )

  const problemPane = (
    <PixelCard
      bodyClassName="flex min-h-0 flex-1 flex-col"
      className="flex h-full min-h-0 flex-col shadow-none"
      title="Problem"
    >
      <div className="flex border-b-4 border-ink font-heading text-[10px]">
        {(['description', 'hints'] as const).map((tab) => (
          <button
            className={`pixel-focus border-r-4 border-ink px-3 py-2 uppercase ${
              activeProblemTab === tab ? 'bg-warning' : 'bg-cream'
            }`}
            key={tab}
            onClick={() => setActiveProblemTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4 text-xl">
        {activeProblemTab === 'description' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-sm leading-relaxed">
                {encounter.question.title}
              </h1>
              <span className="border-4 border-ink bg-warning px-2 py-1 font-heading text-[10px] uppercase">
                {encounter.question.difficulty}
              </span>
              <TypeBadge type={topicBadge} />
            </div>
            <p>{encounter.question.description}</p>
            <div className="grid gap-3">
              {encounter.question.examples.map((example) => (
                <div className="border-4 border-ink bg-white p-3" key={example.input}>
                  <div className="font-heading text-[10px]">Example</div>
                  <p>Input: {example.input}</p>
                  <p>Output: {example.output}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {questionHints.map((hint, index) => (
              <p key={hint}>Hint {index + 1}: {hint}</p>
            ))}
          </div>
        )}
      </div>
    </PixelCard>
  )

  const editorPane = (
    <PixelCard
      bodyClassName="flex min-h-0 flex-1 flex-col"
      className="flex h-full min-h-0 flex-col overflow-hidden shadow-none"
      title="Editor"
    >
      <div className="relative z-10 flex h-16 shrink-0 items-center gap-3 border-b-4 border-ink px-3 pb-2">
        <label className="font-heading text-[10px]" htmlFor="language">
          Language
        </label>
        <select
          className="pixel-focus w-36 border-4 border-ink bg-cream p-1 font-heading text-[10px]"
          disabled={isLocked}
          id="language"
          onChange={(event) => updateLanguage(event.target.value as CodeLanguage)}
          value={language}
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <PixelButton className="px-3 py-2" disabled={isLocked} onClick={() => simulate('samples-pass')}>
          Run
        </PixelButton>
        <PixelButton className="px-3 py-2" disabled={isLocked} onClick={() => simulate('all-pass')}>
          Submit
        </PixelButton>
      </div>

      <Group
        className="min-h-0 flex-1 pt-2"
        defaultLayout={editorLayout.defaultLayout}
        onLayoutChanged={editorLayout.onLayoutChanged}
        orientation="vertical"
      >
        <Panel className="h-full min-h-0" defaultSize="72" id="code" minSize="220px">
          <div className="h-full min-h-0 overflow-hidden border-4 border-ink">
            <Editor
              height="100%"
              language={language}
              onChange={(value) => setCode(value ?? '')}
              options={{
                automaticLayout: true,
                fontFamily: 'Consolas, Courier New, monospace',
                fontSize: 14,
                minimap: { enabled: false },
                readOnly: isLocked,
              }}
              theme="vs-dark"
              value={code}
            />
          </div>
        </Panel>
        <Separator className="h-2 bg-ink hover:bg-warning" />
        <Panel
          className="h-full min-h-0"
          collapsedSize="60px"
          collapsible
          defaultSize="28"
          id="results"
          minSize="140px"
          panelRef={resultsPanelRef}
        >
          <section className="box-border flex h-full min-h-0 flex-col overflow-hidden border-4 border-ink bg-cream">
            <div className="flex h-12 shrink-0 items-center justify-between border-b-4 border-ink px-3">
              <div className="flex gap-2 font-heading text-[10px]">
                {(['results', 'log'] as const).map((tab) => (
                  <button
                    className={`pixel-focus px-2 py-1 uppercase ${
                      activeResultTab === tab ? 'bg-warning' : ''
                    }`}
                    key={tab}
                    onClick={() => setActiveResultTab(tab)}
                    type="button"
                  >
                    {tab === 'log' ? 'Battle log' : 'Results'}
                  </button>
                ))}
              </div>
              <button
                aria-label="Collapse results"
                className="pixel-focus font-heading text-xs"
                onClick={() => resultsPanelRef.current?.collapse()}
                type="button"
              >
                ▼
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {activeResultTab === 'results' ? (
                <div className="space-y-2">{resultRows}</div>
              ) : (
                <ol className="space-y-2 text-lg">
                  {battleLog.map((entry, index) => (
                    <li className="border-b-2 border-ink/30 pb-1" key={`${entry}-${index}`}>
                      {entry}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </Panel>
      </Group>
    </PixelCard>
  )

  function showHint() {
    enqueueEvents([
      {
        type: 'text',
        text: `Hint: ${questionHints[0]}`,
      },
    ])
  }

  function getCatchThreshold(ball: BallItem) {
    if (ball.id === 'master-ball') {
      return 100
    }

    const rarityPenalty = encounter.pokemon.rarity === 'legendary'
      ? 45
      : encounter.pokemon.rarity === 'rare'
        ? 24
        : encounter.pokemon.rarity === 'uncommon'
          ? 12
          : 0
    const difficultyPenalty = encounter.question.difficulty === 'hard'
      ? 12
      : encounter.question.difficulty === 'medium'
        ? 6
        : 0

    return Math.max(18, 68 + ball.bonus - rarityPenalty - difficultyPenalty)
  }

  function getCatchRoll(ball: BallItem) {
    const seed = `${encounter.question.id}-${encounter.pokemon.id}-${ball.id}`

    return seed.split('').reduce((total, character) => {
      return (total * 33 + character.charCodeAt(0)) % 100
    }, 23)
  }

  function startCatch(ball: BallItem) {
    const threshold = getCatchThreshold(ball)
    const roll = getCatchRoll(ball)
    const caught = roll < threshold

    setSelectedBall(ball)
    setIsOutcomeModalDismissed(true)
    setCatchPhase('throwing')
    setBattleLog((current) => [...current.slice(-24), `You threw a ${ball.label}!`])

    window.setTimeout(() => {
      setCatchPhase('shaking')
    }, 700)

    window.setTimeout(() => {
      setCatchPhase(caught ? 'success' : 'breakout')
      setBattleLog((current) => [
        ...current.slice(-24),
        caught
          ? `${encounter.pokemon.name} was caught!`
          : `${encounter.pokemon.name} broke free!`,
      ])
    }, 2600)
  }

  return (
    <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-sky font-pixel text-ink max-[899px]:h-auto max-[899px]:overflow-auto">
      <AppHeader
        coins={245}
        onBag={() => setIsBagOpen(true)}
        onHint={isLocked ? undefined : showHint}
        showBattleActions
      />

      <section
        className={`shrink-0 border-b-4 border-ink bg-[#b7e37b] transition-[height] duration-300 ${
          isBattleCollapsed ? 'h-14' : 'h-[clamp(140px,20dvh,200px)]'
        }`}
      >
        {isBattleCollapsed ? (
          <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
            <HPBar current={playerHp} label="PikaCoder" level={12} max={playerMaxHp} />
            <button
              className="pixel-focus border-4 border-ink bg-cream px-3 py-1 font-heading text-[10px]"
              onClick={() => setIsBattleCollapsed(false)}
              type="button"
            >
              ▲
            </button>
            <HPBar current={enemyHp} label={encounter.pokemon.name} level={14} max={enemyMaxHp} />
          </div>
        ) : (
          <div className="grid h-full grid-cols-[minmax(220px,1fr)_minmax(260px,1.2fr)_minmax(220px,1fr)] items-center gap-4 p-3">
            <div className="grid h-full grid-cols-[96px_1fr] items-center gap-3">
              <Sprite
                className={`max-h-[120px] w-full object-contain transition-all duration-500 ${animationClass(
                  'player',
                  animation,
                )}`}
                id={25}
                type="back"
              />
              <div className="min-w-0">
                <HPBar current={playerHp} label="PikaCoder" level={12} max={playerMaxHp} />
                <XPBar current={42} max={100} label="Next" />
              </div>
            </div>

            <div className="min-w-0">
              <DialogBox
                className="line-clamp-2 h-24 min-h-0 overflow-hidden p-3 text-[10px] leading-5 shadow-[4px_4px_0_#1a1c2c]"
                text={dialogText}
              />
            </div>

            <div className="grid h-full grid-cols-[1fr_96px] items-center gap-3">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <TypeBadge type={topicBadge} />
                  <span className="font-heading text-[10px]">Lv 14</span>
                </div>
                <HPBar current={enemyHp} label={encounter.pokemon.name} level={14} max={enemyMaxHp} />
              </div>
              <Sprite
                className={`max-h-[120px] w-full object-contain transition-all duration-500 ${animationClass(
                  'enemy',
                  animation,
                )}`}
                id={encounter.pokemon.id}
                type="front"
              />
            </div>

            <button
              className="pixel-focus absolute right-4 top-16 border-4 border-ink bg-cream px-2 py-1 font-heading text-[10px]"
              onClick={() => setIsBattleCollapsed(true)}
              type="button"
            >
              ▼
            </button>
          </div>
        )}
      </section>

      <section className="min-h-0 flex-1 p-3 max-[899px]:min-h-[900px]">
        {isNarrow ? (
          <div className="grid gap-3">
            <div className="h-[440px]">{problemPane}</div>
            <div className="h-[720px]">{editorPane}</div>
          </div>
        ) : (
          <Group
            className="h-full min-h-0"
            defaultLayout={mainLayout.defaultLayout}
            onLayoutChanged={mainLayout.onLayoutChanged}
            orientation="horizontal"
          >
            <Panel className="h-full min-h-0" defaultSize="42" id="problem" minSize="28">{problemPane}</Panel>
            <Separator className="mx-2 w-2 bg-ink hover:bg-warning" />
            <Panel className="h-full min-h-0" defaultSize="58" id="editor" minSize="38">{editorPane}</Panel>
          </Group>
        )}
      </section>

      <div className="fixed bottom-4 right-4 z-40">
        {isDevOpen ? (
          <PixelCard className="mb-3 w-64 shadow-[4px_4px_0_#1a1c2c]" title="Dev">
            <div className="grid gap-2">
              <PixelButton disabled={isLocked} onClick={() => simulate('samples-pass')} variant="secondary">
                Samples Pass
              </PixelButton>
              <PixelButton disabled={isLocked} onClick={() => simulate('all-pass')} variant="secondary">
                All Pass
              </PixelButton>
              <PixelButton disabled={isLocked} onClick={() => simulate('hidden-fail')} variant="secondary">
                Hidden Fail
              </PixelButton>
              <PixelButton disabled={isLocked} onClick={() => simulate('efficiency-fail')} variant="secondary">
                Efficiency Fail
              </PixelButton>
              <PixelButton disabled={isLocked} onClick={() => simulate('wrong-answer')} variant="danger">
                Wrong Answer
              </PixelButton>
            </div>
          </PixelCard>
        ) : null}
        <PixelButton onClick={() => setIsDevOpen((value) => !value)} variant="danger">
          Dev
        </PixelButton>
      </div>

      <Modal isOpen={isBagOpen} onClose={() => setIsBagOpen(false)} title="Bag">
        <div className="grid gap-3">
          {[
            { id: 'potion', label: 'Potion x3', note: 'Restore 25 HP.' },
            { id: 'shield', label: 'Shield x1', note: 'Fake shield effect.' },
            { id: 'revive', label: 'Revive x1', note: 'Works only at 0 HP.' },
          ].map((item) => (
            <button
              className="pixel-focus border-4 border-ink bg-cream p-3 text-left hover:bg-warning"
              key={item.id}
              onClick={() => {
                useBagItem(item.id as 'potion' | 'shield' | 'revive')
                setIsBagOpen(false)
              }}
              type="button"
            >
              <span className="block font-heading text-[10px]">{item.label}</span>
              <span className="text-xl">{item.note}</span>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={phase === 'won' && Boolean(victoryRewards) && !isOutcomeModalDismissed}
        onClose={() => setIsOutcomeModalDismissed(true)}
        title="Victory"
      >
        <div className="space-y-4">
          <p className="text-xl">Server playback awarded:</p>
          <p className="font-heading text-xs leading-relaxed">
            {victoryRewards?.xp} XP / {victoryRewards?.coins} coins
          </p>
          <p className="text-xl">
            {encounter.pokemon.name} is weak enough to catch.
          </p>
          <div className="flex justify-center">
            <PixelButton
              onClick={() => {
                setIsOutcomeModalDismissed(true)
                setCatchPhase('choosing')
              }}
            >
              Throw a Ball
            </PixelButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={catchPhase !== 'idle'}
        onClose={() => {
          if (catchPhase === 'choosing' || catchPhase === 'success' || catchPhase === 'breakout') {
            setCatchPhase('idle')
          }
        }}
        title="Catch"
      >
        {catchPhase === 'choosing' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-[96px_1fr] items-center gap-4 border-4 border-ink bg-white p-3">
              <Sprite
                alt={`${encounter.pokemon.name} front sprite`}
                className="h-20 w-20 object-contain"
                id={encounter.pokemon.id}
                type="front"
              />
              <div className="text-xl">
                <p className="font-heading text-[10px]">{encounter.pokemon.name}</p>
                <p>{encounter.pokemon.rarity} encounter</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {ballItems.map((ball) => (
                <button
                  className="pixel-focus grid grid-cols-[48px_1fr] items-center gap-3 border-4 border-ink bg-cream p-3 text-left hover:bg-warning"
                  key={ball.id}
                  onClick={() => startCatch(ball)}
                  type="button"
                >
                  <img
                    alt={`${ball.label} sprite`}
                    className="sprite-image h-10 w-10 object-contain"
                    src={getItemSprite(ball.id)}
                  />
                  <span>
                    <span className="block font-heading text-[10px]">{ball.label}</span>
                    <span className="text-lg">x{ball.count}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <div className="relative mx-auto flex h-44 max-w-sm items-center justify-center border-4 border-ink bg-white">
              {catchPhase === 'success' ? null : (
                <Sprite
                  alt={`${encounter.pokemon.name} front sprite`}
                  className={`h-24 w-24 object-contain transition-opacity ${
                    catchPhase === 'breakout' ? 'opacity-100' : 'opacity-35'
                  }`}
                  id={encounter.pokemon.id}
                  type="front"
                />
              )}
              {selectedBall ? (
                <img
                  alt={`${selectedBall.label} sprite`}
                  className={[
                    'sprite-image absolute h-12 w-12 object-contain',
                    catchPhase === 'throwing' ? 'catch-ball-throw' : '',
                    catchPhase === 'shaking' ? 'catch-ball-shake' : '',
                    catchPhase === 'success' ? 'catch-ball-success' : '',
                    catchPhase === 'breakout' ? 'catch-ball-breakout' : '',
                  ].join(' ')}
                  src={getItemSprite(selectedBall.id)}
                />
              ) : null}
            </div>
            <p className="font-heading text-xs leading-relaxed">
              {catchPhase === 'throwing' ? `You threw a ${selectedBall?.label}.` : null}
              {catchPhase === 'shaking' ? 'Shake... shake... shake...' : null}
              {catchPhase === 'success' ? `${encounter.pokemon.name} was caught!` : null}
              {catchPhase === 'breakout' ? `${encounter.pokemon.name} broke free!` : null}
            </p>
            {catchPhase === 'success' || catchPhase === 'breakout' ? (
              <div className="flex justify-center">
                <PixelButton onClick={() => setCatchPhase('idle')} variant="secondary">
                  Close
                </PixelButton>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={phase === 'lost' && !isOutcomeModalDismissed}
        onClose={() => setIsOutcomeModalDismissed(true)}
        title="Defeat"
      >
        <p className="text-xl">The battle ended, but your draft is still safe.</p>
      </Modal>
    </main>
  )
}
