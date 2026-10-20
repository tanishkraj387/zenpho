import Editor from '@monaco-editor/react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelRef,
} from 'react-resizable-panels'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { DialogBox } from '../components/ui/DialogBox'
import { HPBar } from '../components/ui/HPBar'
import { useGateTransition } from '../components/ui/gateTransition'
import { Modal } from '../components/ui/Modal'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import { BattleStage } from '../components/ui/BattleStage'
import { BattleStatus } from '../components/ui/BattleStatus'
import { loadMoveAnimation, prepareBattleScene } from '../lib/pokerogueAnimation'
import { loadPokemonSprite } from '../lib/pokeroguePokemonSprites'
import { TypeBadge, type TopicType as BadgeTopicType } from '../components/ui/TypeBadge'
import { useBattleQuestion } from '../hooks/useBattleQuestion'
import { useCollectionEntries } from '../hooks/useCollectionEntries'
import { usePlayerSummary } from '../hooks/usePlayerSummary'
import { usePlayerParty } from '../hooks/usePlayerParty'
import { useShopSummary } from '../hooks/useShopSummary'
import { useSolvedQuestions } from '../hooks/useSolvedQuestions'
import {
  codingQuestions,
  getQuestionHints,
  getTopicLabel,
  type CodeLanguage,
} from '../lib/questions'
import { judgeCode, type JudgeDiagnostic, type JudgeResult } from '../lib/judge'
import { getItemSprite, type ItemSpriteName } from '../lib/sprites'
import { useAudioStore } from '../lib/audio'
import { catchPokemon } from '../lib/collection'
import { applyHealingItem } from '../lib/party'
import { markQuestionSolvedLocally } from '../lib/progress'
import {
  recordBattleResult,
  spendBattleEnergy,
  startBattleAttempt,
  takeBattleAction,
  type BattleAttemptStatus,
  type TestGroupStatus,
} from '../lib/battleAttempts'
import { getPokemonById } from '../lib/pokemon'
import {
  getBattleMovesForPokemon,
  getEffectiveness,
  type BattleMove,
} from '../lib/pokemonBattle'
import { useBattleStore } from '../store/battleStore'

type BallItem = {
  id: Extract<ItemSpriteName, 'poke-ball' | 'great-ball' | 'ultra-ball' | 'master-ball'>
  label: string
  count: number
  bonus: number
}

type CatchPhase = 'idle' | 'choosing' | 'throwing' | 'shaking' | 'success' | 'breakout'

type SolveReward = {
  coins: number
  trainerXp: number
  partyXp: number
  energy: number
  maxEnergy: number
}

type BattleCommandMenu = 'root' | 'fight' | 'pokemon'

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

function moveAnimationId(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function battleErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.trim()) return message
  }

  return fallback
}

function animationClass(target: 'player' | 'enemy', animation: string) {
  if (target === 'player') {
    if (animation === 'switch-out') {
      return 'battle-sprite--switch-out'
    }

    if (animation === 'switch-in') {
      return 'battle-sprite--switch-in'
    }

    return ''
  }

  if (animation === 'enemy-faint') {
    return 'battle-sprite--faint'
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
  const transition = useGateTransition()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const battleQuestion = useBattleQuestion(searchParams.get('question'))
  const playerSummary = usePlayerSummary()
  const playerParty = usePlayerParty()
  const shopSummary = useShopSummary()
  const solvedQuestions = useSolvedQuestions()
  const collectionEntries = useCollectionEntries()
  const encounter = battleQuestion.data!
  const partyPokemon = useMemo(() => {
    return playerParty.data ?? []
  }, [playerParty.data])
  const [activePokemonId, setActivePokemonId] = useState<number | null>(null)
  const [activeCreatureId, setActiveCreatureId] = useState<string | null>(null)
  useEffect(() => {
    for (const pokemon of partyPokemon) void loadPokemonSprite(pokemon.id, true).catch(() => undefined)
  }, [partyPokemon])
  const [pendingSwitchPokemonId, setPendingSwitchPokemonId] = useState<number | null>(null)
  const playerPokemon =
    getPokemonById(activePokemonId ?? partyPokemon[0]?.id ?? 25) ?? getPokemonById(25)!
  const topicBadge = getTopicLabel(encounter.question.topic) as BadgeTopicType
  const questionHints = getQuestionHints(encounter.question)
  const questionNumber = codingQuestions.findIndex((question) => question.id === encounter.question.id) + 1
  const openingDialog = `A wild ${encounter.pokemon.name} appeared on ${encounter.routeName}!`
  useEffect(() => {
    for (const pokemon of [playerPokemon, encounter.pokemon]) {
      for (const move of getBattleMovesForPokemon(pokemon)) {
        void loadMoveAnimation(moveAnimationId(move.name), pokemon === playerPokemon ? 'player' : 'enemy').catch(() => undefined)
      }
    }
  }, [playerPokemon, encounter.pokemon])
  const [language, setLanguage] = useState<CodeLanguage>('python')
  const [code, setCode] = useState(encounter.question.starterCode.python)
  const [isBagOpen, setIsBagOpen] = useState(false)
  const [selectedHealingItem, setSelectedHealingItem] = useState<string | null>(null)
  const [isActionPending, setIsActionPending] = useState(false)
  const [needsForcedSwitch, setNeedsForcedSwitch] = useState(false)
  const [isBattleCollapsed, setIsBattleCollapsed] = useState(false)
  const [activeProblemTab, setActiveProblemTab] = useState<'description' | 'hints'>('description')
  const [activeResultTab, setActiveResultTab] = useState<'results' | 'log'>('results')
  const [isOutcomeModalDismissed, setIsOutcomeModalDismissed] = useState(false)
  const [catchPhase, setCatchPhase] = useState<CatchPhase>('idle')
  const [selectedBall, setSelectedBall] = useState<BallItem | null>(null)
  const [solveReward, setSolveReward] = useState<SolveReward | null>(null)
  const [isRematch, setIsRematch] = useState(false)
  const [hasEncounterStarted, setHasEncounterStarted] = useState(false)
  const [isStartingFight, setIsStartingFight] = useState(false)
  const [isSolveRecording, setIsSolveRecording] = useState(false)
  const [isBattleScreenOpen, setIsBattleScreenOpen] = useState(false)
  const [showFightPrompt, setShowFightPrompt] = useState(false)
  const [battleCommandMenu, setBattleCommandMenu] = useState<BattleCommandMenu>('root')
  const [catchError, setCatchError] = useState('')
  const [battleAttemptError, setBattleAttemptError] = useState('')
  const [judgeError, setJudgeError] = useState('')
  const [judgeDiagnostics, setJudgeDiagnostics] = useState<JudgeDiagnostic[]>([])
  const [battleAttemptId, setBattleAttemptId] = useState<string | null>(null)
  const [isWinRecorded, setIsWinRecorded] = useState(false)
  const [battleLog, setBattleLog] = useState<string[]>([
    `A wild ${encounter.pokemon.name} appeared on ${encounter.routeName}!`,
  ])
  const playBattleSe = useAudioStore((state) => state.playBattleSe)
  const playPokemonCry = useAudioStore((state) => state.playPokemonCry)
  const setBgmScene = useAudioStore((state) => state.setBgmScene)
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
    currentEvent,
    dialogText,
    enemyHp,
    enemyMaxHp,
    enqueueEvents,
    finishCurrentEvent,
    phase,
    playerHp,
    playerMaxHp,
    resetBattle,
    setPlayerHp,
    setJudging,
    tests,
  } = useBattleStore()

  const isLocked = phase === 'judging' || phase === 'animating'
  const isSolved = Boolean(solveReward)
  const isQuestionAlreadySolved = (solvedQuestions.data ?? []).includes(encounter.question.id)
  const isPokemonCaught = collectionEntries.data?.[encounter.pokemon.id]?.status === 'caught'
  const canCatchPokemon = !collectionEntries.isLoading && !collectionEntries.isError && !isPokemonCaught
  const isSolvedStateLoading = solvedQuestions.isLoading
  const canUseEncounterMove =
    isSolved && hasEncounterStarted && isBattleScreenOpen && phase !== 'won' && phase !== 'lost' && !isLocked && !isActionPending && !needsForcedSwitch && playerHp > 0
  const canSwitchPokemon = isSolved && hasEncounterStarted && isBattleScreenOpen && phase !== 'won' && phase !== 'lost' && !isLocked && !isActionPending
  const playerMoves = useMemo(() => getBattleMovesForPokemon(playerPokemon), [playerPokemon])
  const ownedItems = useMemo(() => {
    return new Map(shopSummary.data?.items.map((item) => [item.itemKey, item.owned]) ?? [])
  }, [shopSummary.data?.items])
  const ownedBallItems = useMemo(
    () =>
      ballItems.map((ball) => ({
        ...ball,
        count: ownedItems.get(ball.id) ?? 0,
      })),
    [ownedItems],
  )
  const bagItems = useMemo(
    () => (shopSummary.data?.items ?? []).filter((item) => item.category === 'healing'),
    [shopSummary.data?.items],
  )

  useEffect(() => {
    if (phase === 'judging' || phase === 'animating' || phase === 'thinking') {
      setIsOutcomeModalDismissed(false)
    }
  }, [phase])

  useEffect(() => {
    if (!activePokemonId && partyPokemon.length > 0) {
      setActivePokemonId((partyPokemon.find((pokemon) => pokemon.currentHp > 0) ?? partyPokemon[0]).id)
    }
  }, [activePokemonId, partyPokemon])

  useEffect(() => {
    if (!currentEvent) {
      return
    }

    if (currentEvent.type === 'enemy_hit' || currentEvent.type === 'player_hit') {
      playBattleSe(currentEvent.critical || currentEvent.effectiveness > 1 ? 'hit_strong' : 'hit')
    } else if (currentEvent.type === 'switch_out') {
      playBattleSe('pb_rel')
    } else if (currentEvent.type === 'enemy_faint') {
      playBattleSe('faint')
      playPokemonCry(encounter.pokemon.id)
    } else if (currentEvent.type === 'victory') {
      setBgmScene('victory')
    }
  }, [currentEvent, encounter.pokemon.id, playBattleSe, playPokemonCry, setBgmScene])

  useEffect(() => {
    if (currentEvent?.type !== 'switch_in' || pendingSwitchPokemonId === null) return
    setActivePokemonId(pendingSwitchPokemonId)
    playPokemonCry(pendingSwitchPokemonId)
    setPendingSwitchPokemonId(null)
  }, [currentEvent, pendingSwitchPokemonId, playPokemonCry])

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

  async function submitToJudge(mode: 'run' | 'submit') {
    if (isLocked) {
      return
    }

    openResultsDrawer()
    setJudging()
    setJudgeError('')
    setJudgeDiagnostics([])

    try {
      const solvedBeforeSubmit = mode === 'submit' ? await solvedQuestions.refetch() : null
      if (solvedBeforeSubmit?.isError) {
        throw new Error('Could not check previous solves. Please try submitting again.')
      }
      const rematch = solvedBeforeSubmit?.data?.includes(encounter.question.id) ?? false
      const result = await judgeCode({
        code,
        language,
        mode,
        pokemonName: encounter.pokemon.name,
        question: encounter.question,
        topicLabel: getTopicLabel(encounter.question.topic),
      })
      setJudgeDiagnostics(result.diagnostics)

      if (mode === 'submit' && result.solved) {
        setIsSolveRecording(true)
        if (rematch) {
          const rematchAttempt = await startBattleAttempt({
            language,
            pokemonId: encounter.pokemon.id,
            questionId: encounter.question.id,
          })
          if (!rematchAttempt?.id) {
            throw new Error('Could not prepare the rematch. Please submit again.')
          }
          await recordBattleResult({
            attemptId: rematchAttempt.id,
            codeDraft: code,
            efficiencyStatus: result.tests.efficiency,
            enemyHp,
            hiddenStatus: result.tests.hidden,
            language,
            playerHp,
            sampleStatus: result.tests.samples,
            status: 'submitted',
          })
          setBattleAttemptId(rematchAttempt.id)
          await queryClient.invalidateQueries({ queryKey: ['solved-questions'] })
        } else {
          await recordCurrentBattleResult(result.tests)
        }
        setIsSolveRecording(false)
        setIsRematch(rematch)
        setSolveReward(rematch ? { ...result.rewards, coins: 0, trainerXp: 0, partyXp: 0, energy: 0 } : result.rewards)
        setHasEncounterStarted(false)
        transition(() => {
          setIsBattleScreenOpen(true)
          setShowFightPrompt(true)
        }, 'Question solved!')
        setIsBattleCollapsed(false)
        setBattleCommandMenu('root')
      }

      enqueueEvents(result.events, result.tests)
      if (!(mode === 'submit' && result.solved)) {
        void recordCurrentBattleResult(result.tests, getJudgeFinalEventType(result))
      }
    } catch (error) {
      setIsSolveRecording(false)
      const message =
        error instanceof Error
          ? error.message
          : 'The local judge server could not check this submission.'

      setJudgeError(message)
      setJudgeDiagnostics([])
      setActiveResultTab('results')
      enqueueEvents(
        [
          {
            type: 'text',
            text: 'The submission could not be checked. See Results for the error.',
          },
          { type: 'text', text: message },
        ],
        {
          efficiency: 'pending',
          hidden: 'pending',
          samples: 'failed',
        },
      )
    }
  }

  function getJudgeFinalEventType(result: JudgeResult) {
    if (!result.solved) {
      return undefined
    }

    return undefined
  }

  useEffect(() => {
    resetBattle(openingDialog)
    setCode(encounter.question.starterCode[language])
    setBattleLog([openingDialog])
    playPokemonCry(encounter.pokemon.id)
    setCatchPhase('idle')
    setSelectedBall(null)
    setSolveReward(null)
    setIsRematch(false)
    setHasEncounterStarted(false)
    setIsBattleScreenOpen(false)
    setShowFightPrompt(false)
    setBattleCommandMenu('root')
    setNeedsForcedSwitch(false)
    setActiveCreatureId(null)
    setActivePokemonId(null)
    setBattleAttemptError('')
    setJudgeError('')
    setJudgeDiagnostics([])
    setBattleAttemptId(null)
    setIsWinRecorded(false)

    startBattleAttempt({
      language,
      pokemonId: encounter.pokemon.id,
      questionId: encounter.question.id,
    })
      .then((attempt) => {
        setBattleAttemptId(attempt?.id ?? null)
      })
      .catch((error) => {
        setBattleAttemptError(battleErrorMessage(error, 'Could not create battle attempt.'))
      })
  }, [
    encounter.question.id,
    encounter.question.starterCode,
    encounter.pokemon.id,
    language,
    openingDialog,
    playPokemonCry,
    resetBattle,
  ])

  useEffect(() => {
    if (hasEncounterStarted) return
    const member = partyPokemon.find((pokemon) => pokemon.id === activePokemonId)
    if (member) setPlayerHp(member.currentHp, member.maxHp)
  }, [activePokemonId, hasEncounterStarted, partyPokemon, setPlayerHp])

  function updateLanguage(nextLanguage: CodeLanguage) {
    setLanguage(nextLanguage)
    setCode(encounter.question.starterCode[nextLanguage])
  }

  async function recordCurrentBattleResult(
    nextTests: Record<'samples' | 'hidden' | 'efficiency', TestGroupStatus>,
    finalEventType?: string,
  ) {
    if (!battleAttemptId) {
      return
    }

    const battleStatus: BattleAttemptStatus =
      finalEventType === 'victory'
        ? 'won'
        : finalEventType === 'defeat'
          ? 'lost'
          : 'submitted'
    const nextEnemyHp = battleStatus === 'won' ? 0 : enemyHp
    const nextPlayerHp = battleStatus === 'lost' ? 0 : playerHp

    try {
      await recordBattleResult({
        attemptId: battleAttemptId,
        codeDraft: code,
        efficiencyStatus: nextTests.efficiency,
        enemyHp: nextEnemyHp,
        hiddenStatus: nextTests.hidden,
        language,
        playerHp: nextPlayerHp,
        sampleStatus: nextTests.samples,
        status: battleStatus,
      })
      if (battleStatus === 'won') {
        if (!isRematch) markQuestionSolvedLocally(encounter.question.id)
        setIsWinRecorded(true)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['player-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['player-party'] }),
        queryClient.invalidateQueries({ queryKey: ['profile-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['solved-questions'] }),
      ])
    } catch (error) {
      setBattleAttemptError(battleErrorMessage(error, 'Could not record battle result.'))
    }
  }

  function startEncounterFight() {
    if (!solveReward || isLocked || isStartingFight) {
      return
    }

    setBattleAttemptError('')
    setIsStartingFight(true)
    void (async () => {
      try {
        if (!battleAttemptId) throw new Error('The battle attempt is still being prepared. Try again in a moment.')
        const freshParty = await playerParty.refetch()
        const lead = freshParty.data?.find((pokemon) => pokemon.currentHp > 0)
        if (!lead) throw new Error('No healthy Pokemon is available in your party. Use a Revive first.')
        await prepareBattleScene(lead.id, encounter.pokemon.id)
        const remainingEnergy = await spendBattleEnergy(battleAttemptId)
        if (remainingEnergy === null) {
          throw new Error('Sign in to spend energy and start this battle.')
        }
        setActivePokemonId(lead.id)
        setActiveCreatureId(lead.creatureId)
        setPlayerHp(lead.currentHp, lead.maxHp)
        setHasEncounterStarted(true)
        setShowFightPrompt(false)
        setIsBattleScreenOpen(true)
        playPokemonCry(lead.id)
        setBgmScene('battle')
        enqueueEvents([
          { type: 'text', text: `${lead.name} stepped forward. 1 energy was spent to enter this battle; ${remainingEnergy} remains.` },
          { type: 'text', text: `${encounter.pokemon.name} is ready to battle.` },
        ])
        void queryClient.invalidateQueries({ queryKey: ['player-summary'] })
      } catch (error) {
        setBattleAttemptError(battleErrorMessage(error, 'Could not start the battle.'))
        setShowFightPrompt(true)
      } finally {
        setIsStartingFight(false)
      }
    })()
  }

  async function runBattleAction(action: 'move' | 'switch' | 'item', options: {
    moveName?: string
    creatureId?: string
    itemKey?: string
  } = {}) {
    if (!battleAttemptId || isActionPending) return
    setIsActionPending(true)
    setBattleAttemptError('')
    try {
      const result = await takeBattleAction({ attemptId: battleAttemptId, action, ...options })
      if (action === 'switch') {
        const nextPokemon = partyPokemon.find((pokemon) => pokemon.creatureId === result.activeCreatureId)
        if (nextPokemon) setPendingSwitchPokemonId(nextPokemon.id)
        setActiveCreatureId(result.activeCreatureId)
      }
      setNeedsForcedSwitch(result.needsSwitch)
      setBattleCommandMenu('root')
      setIsBagOpen(false)
      setSelectedHealingItem(null)
      enqueueEvents(result.events)
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['player-party'] }),
        queryClient.invalidateQueries({ queryKey: ['owned-creatures'] }),
        queryClient.invalidateQueries({ queryKey: ['shop-summary'] }),
      ])
      if (result.outcome) {
        await recordCurrentBattleResult(
          { samples: 'passed', hidden: 'passed', efficiency: 'passed' },
          result.outcome === 'won' ? 'victory' : 'defeat',
        )
      }
    } catch (error) {
      const message = battleErrorMessage(error, 'Battle action failed.')
      setBattleAttemptError(message)
      enqueueEvents([{ type: 'text', text: message }])
    } finally {
      setIsActionPending(false)
    }
  }

  function performEncounterMove(move: BattleMove) {
    if (!canUseEncounterMove) return
    void runBattleAction('move', { moveName: move.name })
  }

  function switchPokemon(creatureId: string) {
    const nextPokemon = partyPokemon.find((pokemon) => pokemon.creatureId === creatureId)
    if (!canSwitchPokemon || !nextPokemon || nextPokemon.currentHp <= 0 || creatureId === activeCreatureId) return
    void runBattleAction('switch', { creatureId })
  }

  async function healPokemon(creatureId: string) {
    if (!selectedHealingItem || isActionPending) return
    if (hasEncounterStarted && phase !== 'won' && phase !== 'lost') {
      await runBattleAction('item', { creatureId, itemKey: selectedHealingItem })
      return
    }
    setIsActionPending(true)
    try {
      await applyHealingItem(creatureId, selectedHealingItem)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['player-party'] }),
        queryClient.invalidateQueries({ queryKey: ['owned-creatures'] }),
        queryClient.invalidateQueries({ queryKey: ['shop-summary'] }),
      ])
      setIsBagOpen(false)
      setSelectedHealingItem(null)
    } catch (error) {
      setBattleAttemptError(battleErrorMessage(error, 'Could not use this item.'))
    } finally {
      setIsActionPending(false)
    }
  }

  const resultRows = useMemo(
    () =>
      tests.map((test) => (
        <div
          className="grid gap-2 border-4 border-ink bg-white p-2"
          key={test.id}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-heading text-[10px]">{test.label}</span>
            <span
              className={`border-4 border-ink px-2 py-1 font-heading text-[10px] ${resultClass(
                test.state,
              )}`}
            >
              {test.state}
            </span>
          </div>
          {judgeDiagnostics.find((diagnostic) => diagnostic.group === test.id) ? (
            <div className="space-y-2 text-base">
              <pre className="whitespace-pre-wrap break-words font-pixel text-lg">{judgeDiagnostics.find((diagnostic) => diagnostic.group === test.id)?.message}</pre>
              {test.id === 'samples' && test.state === 'failed' &&
              (judgeDiagnostics.find((diagnostic) => diagnostic.group === test.id)?.expected !== undefined ||
                judgeDiagnostics.find((diagnostic) => diagnostic.group === test.id)?.actual !== undefined) ? (
                <div className="grid gap-1 bg-cream p-2">
                  <span>Expected: {JSON.stringify(judgeDiagnostics.find((diagnostic) => diagnostic.group === test.id)?.expected) ?? 'No output'}</span>
                  <span>Received: {JSON.stringify(judgeDiagnostics.find((diagnostic) => diagnostic.group === test.id)?.actual) ?? 'No output'}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )),
    [judgeDiagnostics, tests],
  )

  const problemPane = (
    <PixelCard
      bodyClassName="flex min-h-0 flex-1 flex-col"
      className="flex h-full min-h-0 flex-col shadow-none"
      title="Description"
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
                {questionNumber > 0 ? `${questionNumber}. ` : ''}{encounter.question.title}
              </h1>
              <span className="border-4 border-ink bg-warning px-2 py-1 font-heading text-[10px] uppercase">
                {encounter.question.difficulty}
              </span>
              <TypeBadge type={topicBadge} />
            </div>
            {battleAttemptError ? (
              <p role="alert" className="border-4 border-ink bg-warning p-3 text-lg">
                Battle error: {battleAttemptError}
              </p>
            ) : null}
            {judgeError ? (
              <p className="border-4 border-ink bg-danger p-3 text-lg text-cream">
                Submission error: {judgeError}
              </p>
            ) : null}
            {isQuestionAlreadySolved ? (
              <p className="border-4 border-ink bg-hp-green p-3 text-lg text-cream">
                Solved. Submit again to rematch this Pokemon. Rematches give no coins or XP, but you can catch it if you do not own it yet.
              </p>
            ) : null}
            <p className="leading-relaxed">{encounter.question.description}</p>
            <div className="grid gap-4">
              {encounter.question.examples.map((example, index) => (
                <div className="border-l-4 border-ink bg-white p-4" key={example.input}>
                  <h2 className="mb-2 font-heading text-[10px]">Example {index + 1}</h2>
                  <p><strong>Input:</strong> <code>{example.input}</code></p>
                  <p><strong>Output:</strong> <code>{example.output}</code></p>
                  {example.explanation ? <p><strong>Explanation:</strong> {example.explanation}</p> : null}
                </div>
              ))}
            </div>
            {encounter.question.constraints?.length ? (
              <div>
                <h2 className="mb-3 font-heading text-[10px]">Constraints</h2>
                <ul className="list-disc space-y-1 pl-6">
                  {encounter.question.constraints.map((constraint) => <li key={constraint}><code>{constraint}</code></li>)}
                </ul>
              </div>
            ) : null}
            <div className="space-y-3 border-4 border-ink bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-[10px] uppercase">Encounter Flow</p>
                  <p>
                    Solve the problem to earn 1 energy. Entering a battle costs
                    1 energy; moves and switching are free.
                  </p>
                </div>
                <span className={`border-4 border-ink px-2 py-1 font-heading text-[10px] uppercase ${
                  isSolved ? 'bg-hp-green text-cream' : 'bg-warning text-ink'
                }`}>
                  {isSolved ? 'Solved' : 'Code phase'}
                </span>
              </div>

              {solveReward && !isRematch ? (
                <div className="grid gap-2 sm:grid-cols-1">
                  <div className="border-4 border-ink bg-cream p-2">
                    <p className="font-heading text-[9px] uppercase">Battle energy earned</p>
                    <p className="font-heading text-lg">+{solveReward.energy}</p>
                  </div>
                </div>
              ) : isRematch ? (
                <p className="border-4 border-ink bg-sky p-3 text-lg">Rematch ready. This duplicate solve earned no rewards; entering still costs 1 energy.</p>
              ) : null}

              {solveReward && !hasEncounterStarted ? (
                <PixelButton disabled={isLocked || isStartingFight || isSolveRecording} onClick={() => transition(() => {
                  setIsBattleScreenOpen(true)
                  setShowFightPrompt(true)
                }, 'Entering the arena')}>
                  Go to Battle
                </PixelButton>
              ) : null}

              {hasEncounterStarted ? (
                <PixelButton onClick={() => transition(() => setIsBattleScreenOpen(true), 'Entering the arena')} variant="secondary">
                  Return to Fight
                </PixelButton>
              ) : null}
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
      <div className="relative z-10 grid shrink-0 gap-2 border-b-4 border-ink px-3 py-2 xl:grid-cols-[auto_1fr] xl:items-center">
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex flex-wrap gap-2">
          <PixelButton
            className="min-h-12 px-4 py-2"
            disabled={isLocked}
            onClick={() => void submitToJudge('run')}
            variant="secondary"
          >
            Run
          </PixelButton>
          <PixelButton
            className="min-h-12 px-4 py-2"
            disabled={isLocked || isSolved || isSolvedStateLoading}
            onClick={() => void submitToJudge('submit')}
          >
            {isQuestionAlreadySolved ? 'Submit again' : 'Submit'}
          </PixelButton>
          <PixelButton
            className="min-h-12 px-4 py-2"
            disabled={isLocked}
            onClick={showHint}
            variant="secondary"
          >
            Hint
          </PixelButton>
        </div>
      </div>

      <Group
        className="min-h-0 flex-1 pt-2"
        defaultLayout={editorLayout.defaultLayout}
        onLayoutChanged={editorLayout.onLayoutChanged}
        orientation="vertical"
      >
        <Panel className="min-h-0" defaultSize="72" id="code" minSize="160px">
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
        <Separator aria-label="Resize editor and submissions" className="submission-resize-handle pixel-focus flex h-3 shrink-0 cursor-row-resize items-center justify-center bg-ink hover:bg-warning"><span aria-hidden="true" /></Separator>
        <Panel
          className="min-h-0"
          collapsedSize="60px"
          collapsible
          defaultSize="28"
          id="results"
          minSize="160px"
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
                aria-label="Expand or collapse results"
                className="pixel-focus font-heading text-xs"
                onClick={() => {
                  if (resultsPanelRef.current?.isCollapsed()) resultsPanelRef.current.expand()
                  else resultsPanelRef.current?.collapse()
                }}
                type="button"
              >
                Resize
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {activeResultTab === 'results' ? (
                <div className="space-y-2">
                  {judgeError ? <p role="alert" className="border-4 border-danger bg-white p-3 text-lg text-danger">Submission error: {judgeError}</p> : null}
                  {battleAttemptError ? <p role="alert" className="border-4 border-danger bg-white p-3 text-lg text-danger">Battle save error: {battleAttemptError}</p> : null}
                  {resultRows}
                </div>
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

  const battleMoveButtons = (
    <>
      {battleCommandMenu === 'root' ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            className="pixel-focus min-h-12 border-4 border-ink bg-cream p-2 text-left font-heading text-[10px] hover:bg-warning"
            disabled={!canUseEncounterMove}
            onClick={() => setBattleCommandMenu('fight')}
            type="button"
          >
            Fight
          </button>
          <button
            className="pixel-focus min-h-12 border-4 border-ink bg-cream p-2 text-left font-heading text-[10px] hover:bg-warning"
            disabled={!canUseEncounterMove}
            onClick={() => setIsBagOpen(true)}
            type="button"
          >
            Bag
          </button>
          <button
            className="pixel-focus min-h-12 border-4 border-ink bg-cream p-2 text-left font-heading text-[10px] hover:bg-warning"
            disabled={!canSwitchPokemon}
            onClick={() => setBattleCommandMenu('pokemon')}
            type="button"
          >
            Pokemon
          </button>
          <button className="pixel-focus" type="button"
            onClick={() => transition(() => setIsBattleScreenOpen(false), 'Returning to your solution')}>
            Code
          </button>
        </div>
      ) : null}

      {battleCommandMenu === 'fight' ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {playerMoves.map((move) => {
            const effectiveness = getEffectiveness(move.type, encounter.pokemon.types)
            const effectivenessLabel =
              effectiveness === 0
                ? 'No effect'
                : effectiveness > 1
                  ? 'Super effective'
                  : effectiveness < 1
                    ? 'Not very effective'
                    : 'Normal'

            return (
              <button
                className={`battle-move-card battle-move-card--${move.type.toLowerCase()} pixel-focus grid min-h-[76px] content-center gap-1 border-4 border-ink bg-cream p-2 text-left hover:bg-warning disabled:opacity-60`}
                disabled={!canUseEncounterMove}
                key={move.name}
                onClick={() => performEncounterMove(move)}
                type="button"
              >
                <span className="flex items-center justify-between gap-2 font-heading text-[10px]">
                  <span>{move.name}</span>
                  <span className="battle-move-card__type">{move.type}</span>
                </span>
                <span className="text-base">Power {move.power} · Accuracy {move.accuracy}%</span>
                <span className="text-sm">{effectivenessLabel}</span>
              </button>
            )
          })}
        </div>
      ) : null}

      {battleCommandMenu === 'pokemon' ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {partyPokemon.map((pokemon) => (
            <button
              className="pixel-focus grid min-h-[76px] grid-cols-[44px_1fr] items-center gap-2 border-4 border-ink bg-cream p-2 text-left hover:bg-warning disabled:opacity-60"
              disabled={!canSwitchPokemon || pokemon.currentHp === 0 || pokemon.creatureId === activeCreatureId}
              key={pokemon.id}
              onClick={() => switchPokemon(pokemon.creatureId)}
              type="button"
            >
              <Sprite
                alt={`${pokemon.name} icon`}
                className="h-8 w-8 object-contain"
                id={pokemon.id}
                type="icon"
              />
              <span>
                <span className="block font-heading text-[10px]">{pokemon.name}</span>
                <span className="text-lg">
                  {pokemon.currentHp === 0 ? 'Fainted' : pokemon.creatureId === activeCreatureId ? 'Active' : 'Ready'} · {pokemon.currentHp}/{pokemon.maxHp} HP
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </>
  )

  const classicBattleScreen = (
    <section className="pokerogue-battle" aria-label="Battle">
      <div className="pokerogue-stage">
        <BattleStage
          playerId={playerPokemon.id}
          enemyId={encounter.pokemon.id}
          event={currentEvent}
          onComplete={finishCurrentEvent}
        />
        <BattleStatus side="enemy" name={encounter.pokemon.name} hp={enemyHp} maxHp={enemyMaxHp} />
        <BattleStatus side="player" name={playerPokemon.name}
          level={partyPokemon.find(pokemon => pokemon.id === playerPokemon.id)?.level}
          hp={playerHp} maxHp={playerMaxHp} />
        <div className={`pokerogue-console ${canUseEncounterMove ? '' : 'pokerogue-console--playing'}`}>
          <DialogBox className="pokerogue-console__message" speed={18}
            text={canUseEncounterMove ? `What will ${playerPokemon.name} do?` : dialogText} />
          {canUseEncounterMove && <div className="pokerogue-console__commands">{battleMoveButtons}</div>}
        </div>
        <div className="pokerogue-stage__toolbar">
          {battleCommandMenu !== 'root' && canUseEncounterMove &&
            <button className="pixel-focus" onClick={() => setBattleCommandMenu('root')} type="button">Back</button>}
          <button className="pixel-focus" disabled={isLocked}
            onClick={() => transition(() => setIsBattleScreenOpen(false), 'Returning to your solution')} type="button">Code</button>
        </div>
      </div>
    </section>
  )

  function showHint() {
    enqueueEvents([
      {
        type: 'text',
        text: `Hint: ${questionHints[0]}`,
      },
    ])
  }

  async function startCatch(ball: BallItem) {
    if (!canCatchPokemon || !isWinRecorded) return
    setSelectedBall(ball)
    setCatchError('')
    setIsOutcomeModalDismissed(true)
    setCatchPhase('throwing')
    playBattleSe('pb_throw')
    setBgmScene('catch')
    setBattleLog((current) => [...current.slice(-24), `You threw a ${ball.label}!`])

    let caught = false

    try {
      const result = await catchPokemon({
        ballItemKey: ball.id,
        pokemonId: encounter.pokemon.id,
        questionId: encounter.question.id,
      })

      caught = result.caught
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['shop-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['collection-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['player-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['player-party'] }),
        queryClient.invalidateQueries({ queryKey: ['solved-questions'] }),
      ])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Catch failed.'
      setCatchError(message)
      setCatchPhase('choosing')
      setBattleLog((current) => [...current.slice(-24), message])
      return
    }

    window.setTimeout(() => {
      setCatchPhase('shaking')
      playBattleSe('pb_bounce_1')
    }, 700)

    window.setTimeout(() => {
      setCatchPhase(caught ? 'success' : 'breakout')
      playBattleSe(caught ? 'pb_catch' : 'pb_bounce_2')
      setBgmScene(caught ? 'victory' : 'battle')
      setBattleLog((current) => [
        ...current.slice(-24),
        caught
          ? `${encounter.pokemon.name} was caught!`
          : `${encounter.pokemon.name} broke free!`,
      ])
    }, 2600)
  }

  return (
    <main className={`flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-sky font-pixel text-ink ${isBattleScreenOpen ? '' : 'max-[899px]:h-auto max-[899px]:overflow-auto'}`}>
      <AppHeader
        coins={playerSummary.data?.coins ?? 0}
        onBag={() => {
          if (!hasEncounterStarted || canUseEncounterMove || phase === 'won' || phase === 'lost') setIsBagOpen(true)
        }}
        onHint={isLocked ? undefined : showHint}
        showBattleActions
      />

      {!isBattleScreenOpen ? (
        <section
          className={`shrink-0 border-b-4 border-ink bg-[#b7e37b] transition-[height] duration-300 ${
            isBattleCollapsed ? 'h-14' : 'h-[clamp(140px,20dvh,200px)]'
          }`}
        >
          {isBattleCollapsed ? (
            <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-4">
              <HPBar current={playerHp} label={playerPokemon.name} level={partyPokemon.find((pokemon) => pokemon.id === playerPokemon.id)?.level} max={playerMaxHp} />
              <button
                className="pixel-focus border-4 border-ink bg-cream px-3 py-1 font-heading text-[10px]"
                onClick={() => setIsBattleCollapsed(false)}
                type="button"
              >
                ▲
              </button>
              <HPBar current={enemyHp} label={encounter.pokemon.name} max={enemyMaxHp} />
            </div>
          ) : (
            <div className="battle-preview grid h-full grid-cols-[minmax(220px,1fr)_minmax(260px,1.2fr)_minmax(220px,1fr)] items-center gap-4 p-3">
            <div className="grid h-full grid-cols-[96px_1fr] items-center gap-3">
              <div className="relative">
                <Sprite
                  className={`max-h-[120px] w-full object-contain transition-all duration-500 ${animationClass(
                    'player',
                    animation,
                  )}`}
                  id={playerPokemon.id}
                  type="back"
                />
              </div>
              <div className="min-w-0">
                <HPBar current={playerHp} label={playerPokemon.name} level={partyPokemon.find((pokemon) => pokemon.id === playerPokemon.id)?.level} max={playerMaxHp} />
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
                </div>
                <HPBar current={enemyHp} label={encounter.pokemon.name} max={enemyMaxHp} />
              </div>
              <div className="relative">
                <Sprite
                  className={`max-h-[120px] w-full object-contain transition-all duration-500 ${animationClass(
                    'enemy',
                    animation,
                  )}`}
                  id={encounter.pokemon.id}
                  type="front"
                />
              </div>
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
      ) : null}

      <section className={`min-h-0 flex-1 p-3 ${isBattleScreenOpen ? 'battle-viewport overflow-hidden' : 'max-[899px]:min-h-[900px]'}`}>
        {isBattleScreenOpen ? (
          classicBattleScreen
        ) : isNarrow ? (
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

      <Modal isOpen={isBagOpen} onClose={() => { setIsBagOpen(false); setSelectedHealingItem(null) }} title="Bag">
        {battleAttemptError ? <p role="alert" className="text-danger">{battleAttemptError}</p> : null}
        {!selectedHealingItem ? <div className="grid gap-3">
          {bagItems.map((item) => <button
            className="pixel-focus border-4 border-ink bg-cream p-3 text-left hover:bg-warning disabled:opacity-50"
            disabled={item.owned <= 0 || isActionPending}
            key={item.itemKey}
            onClick={() => setSelectedHealingItem(item.itemKey)}
            type="button"
          ><span className="block font-heading text-[10px]">{item.name} · {item.owned}</span><span className="text-xl">{item.effect}</span></button>)}
        </div> : <div className="grid gap-3">
          <p>Use {bagItems.find((item) => item.itemKey === selectedHealingItem)?.name} on:</p>
          {partyPokemon.map((pokemon) => {
            const isRevive = selectedHealingItem === 'revive' || selectedHealingItem === 'max-revive'
            const canHeal = isRevive ? pokemon.currentHp === 0 : pokemon.currentHp > 0 && pokemon.currentHp < pokemon.maxHp
            return <button className="pixel-focus border-4 border-ink bg-cream p-3 text-left hover:bg-warning disabled:opacity-50"
              disabled={!canHeal || isActionPending} key={pokemon.creatureId}
              onClick={() => void healPokemon(pokemon.creatureId)} type="button">
              {pokemon.name} · {pokemon.currentHp}/{pokemon.maxHp} HP
            </button>
          })}
          <PixelButton onClick={() => setSelectedHealingItem(null)} variant="secondary">Back to items</PixelButton>
        </div>}
      </Modal>

      <Modal isOpen={needsForcedSwitch && phase !== 'animating' && phase !== 'lost'} onClose={() => undefined} showCloseButton={false} title="Choose your next Pokemon">
        <p>Your active Pokemon fainted. Pick a healthy party member to keep fighting.</p>
        {battleAttemptError ? <p role="alert" className="text-danger">{battleAttemptError}</p> : null}
        <div className="grid gap-2">{partyPokemon.filter((pokemon) => pokemon.currentHp > 0 && pokemon.creatureId !== activeCreatureId).map((pokemon) =>
          <button className="pixel-focus border-4 border-ink bg-cream p-3 text-left hover:bg-warning disabled:opacity-50"
            disabled={isActionPending} key={pokemon.creatureId} onClick={() => switchPokemon(pokemon.creatureId)} type="button">
            {pokemon.name} · {pokemon.currentHp}/{pokemon.maxHp} HP
          </button>)}</div>
      </Modal>

      <Modal
        isOpen={showFightPrompt && !isLocked}
        onClose={() => navigate('/hub')}
        title="Question solved"
      >
        <div className="space-y-4">
          <p className="text-xl">Your solution passed every checkpoint. Fight {encounter.pokemon.name} for 1 energy?</p>
          {isRematch ? <p className="text-lg">This rematch gives no coins or XP. {isPokemonCaught ? 'You already own this Pokemon.' : 'You can catch this Pokemon if you win.'}</p> : null}
          {battleAttemptError ? <p className="border-4 border-danger bg-white p-3 text-danger" role="alert">{battleAttemptError}</p> : null}
          <div className="flex flex-wrap justify-center gap-3">
            <PixelButton disabled={isStartingFight || !battleAttemptId} onClick={startEncounterFight}>
              {isStartingFight ? 'Opening gates...' : 'Fight · 1 energy'}
            </PixelButton>
            <PixelButton onClick={() => navigate('/hub')} variant="secondary">Back to Hub</PixelButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={phase === 'won' && !isOutcomeModalDismissed}
        onClose={() => setIsOutcomeModalDismissed(true)}
        title={isRematch ? 'Rematch complete' : 'Victory'}
      >
        <div className="space-y-4">
          <p className="text-xl">{isPokemonCaught ? `You already own ${encounter.pokemon.name}.` : `${encounter.pokemon.name} is weak enough to catch.`}</p>
          {isRematch ? <p className="text-lg">Rematches give no coins or XP.</p> : null}
          {collectionEntries.isError ? <p role="alert" className="text-lg">Could not check your collection. Try again shortly.</p> : null}
          {!isRematch && isWinRecorded ? <p className="font-heading text-xs leading-relaxed">Victory rewards credited to your trainer and party.</p> : null}
          <div className="flex justify-center">
            {canCatchPokemon ? <PixelButton
              disabled={!isWinRecorded}
              onClick={() => {
                if (!isWinRecorded) {
                  return
                }

                setIsOutcomeModalDismissed(true)
                setCatchPhase('choosing')
                setCatchError('')
              }}
            >
              {isWinRecorded ? 'Throw a Ball' : 'Saving Win...'}
            </PixelButton> : null}
            <PixelButton
              className="ml-3"
              onClick={() => navigate('/practice')}
              variant="secondary"
            >
              Back to Problems
            </PixelButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={catchPhase !== 'idle'}
        onClose={() => {
          if (catchPhase === 'success' || catchPhase === 'breakout') {
            navigate('/practice')
          } else if (catchPhase === 'choosing') {
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
              {ownedBallItems.map((ball) => (
                <button
                  className="pixel-focus grid grid-cols-[48px_1fr] items-center gap-3 border-4 border-ink bg-cream p-3 text-left hover:bg-warning"
                  disabled={ball.count <= 0}
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
            {catchError ? (
              <p className="border-4 border-ink bg-danger p-3 text-cream" role="alert">
                {catchError}
              </p>
            ) : null}
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
                <PixelButton onClick={() => navigate('/practice')} variant="secondary">
                  Back to Problems
                </PixelButton>
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={phase === 'lost' && !isOutcomeModalDismissed}
        onClose={() => navigate('/practice')}
        title="Defeat"
      >
        <div className="space-y-4">
          <p className="text-xl">The battle ended, but your draft is still safe.</p>
          <div className="flex justify-center">
            <PixelButton onClick={() => navigate('/practice')} variant="secondary">
              Back to Problems
            </PixelButton>
          </div>
        </div>
      </Modal>
    </main>
  )
}
