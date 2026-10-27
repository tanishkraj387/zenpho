import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '../../lib/audio'
import { loadPokemonSprite, type LoadedPokemonSprite } from '../../lib/pokeroguePokemonSprites'
import {
  BATTLE_HEIGHT, BATTLE_WIDTH, MOVE_FRAME_MS, loadBattleImage, loadMoveAnimation,
  nativeSprite, paintMoveBackground, paintMoveFrame, positions,
  type AnimFrame, type LoadedMoveAnimation,
} from '../../lib/pokerogueAnimation'
import type { BattleEvent } from '../../store/battleStore'

type Playback = {
  event: BattleEvent | null; elapsed: number; lastFrame: number
  loaded: LoadedMoveAnimation | null; finished: boolean; frames: AnimFrame[]
}

export function BattleStage({ playerId, enemyId, event, onComplete }: {
  playerId: number; enemyId: number; event: BattleEvent | null; onComplete: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playback = useRef<Playback>({ event: null, elapsed: 0, lastFrame: -1, loaded: null, finished: false, frames: [] })
  const complete = useRef(onComplete)
  const fainted = useRef(false)
  const intro = useRef(0)
  const [error, setError] = useState('')

  useEffect(() => { complete.current = onComplete }, [onComplete])

  useEffect(() => {
    const state: Playback = { event, elapsed: 0, lastFrame: -1, loaded: null, finished: false, frames: [] }
    playback.current = state
    if (event?.type === 'enemy_faint' || event?.type === 'victory') fainted.current = true
    if (event?.type !== 'player_attack' && event?.type !== 'enemy_attack') return
    void loadMoveAnimation(event.animationId, event.type === 'player_attack' ? 'player' : 'enemy').then(loaded => {
      if (playback.current === state) state.loaded = loaded
    }).catch(() => {
      if (playback.current !== state) return
      setError('The move animation could not load. Battle playback will continue.')
      state.finished = true
      complete.current()
    })
  }, [event])

  useEffect(() => {
    let cancelled = false
    let request = 0
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: false })
    if (!canvas || !context) return
    canvas.width = BATTLE_WIDTH
    canvas.height = BATTLE_HEIGHT
    context.imageSmoothingEnabled = false
    const load = async () => {
      const [player, enemy, background, playerBase, enemyBase] = await Promise.all([
        loadPokemonSprite(playerId, true), loadPokemonSprite(enemyId),
        ...['grass_bg', 'grass_a', 'grass_b'].map(name => loadBattleImage(`/pokerogue/images/arenas/${name}.png`)),
      ])
      if (cancelled) return
      const sprites: LoadedPokemonSprite[] = [player, enemy]
      let previousTime = performance.now()
      let idleTime = 0

      const draw = (time: number) => {
        if (cancelled) return
        const delta = Math.min(50, Math.max(0, time - previousTime))
        previousTime = time
        idleTime += delta
        intro.current += delta
        const state = playback.current
        const attack = state.event?.type === 'player_attack' || state.event?.type === 'enemy_attack'
        if (!attack || state.loaded) state.elapsed += delta
        const tick = Math.floor(idleTime / 100)
        const entrance = Math.max(0, 1 - intro.current / 800)
        context.clearRect(0, 0, BATTLE_WIDTH, BATTLE_HEIGHT)
        context.drawImage(background, 0, 0)
        context.drawImage(enemyBase, entrance * 160, 0)
        context.drawImage(playerBase, -entrance * 160, 0)

        if (attack && state.loaded && !state.finished) {
          const index = Math.floor(state.elapsed / MOVE_FRAME_MS)
          const duration = Math.max(state.loaded.data.frames.length * MOVE_FRAME_MS,
            ...Object.entries(state.loaded.data.frameTimedEvents ?? {}).flatMap(([frame, events]) =>
              events.map(item => (Number(frame) + (item.duration ?? 0)) * MOVE_FRAME_MS)))
          if (state.elapsed >= duration) {
            state.finished = true
            // The next event begins only after the actual animation completes.
            complete.current()
          } else {
            for (let i = state.lastFrame + 1; i <= index; i++) {
              const next = state.loaded.data.frames[i]
              if (next) {
                // PokéRogue retains locked battler frames when later frames omit them.
                const retained = state.frames.filter(frame => frame.locked && !next.some(item => item.target === frame.target))
                state.frames = [...retained, ...next]
              }
              for (const cue of state.loaded.data.frameTimedEvents?.[String(i)] ?? []) {
                if (cue.eventType === 'AnimTimedSoundEvent') {
                  const audio = useAudioStore.getState()
                  if (cue.resourceName) audio.playBattleCue(cue.resourceName, cue.volume ?? 100, cue.pitch ?? 100)
                  else audio.playPokemonCry(state.event?.type === 'player_attack' ? playerId : enemyId)
                }
              }
            }
            state.lastFrame = index
            paintMoveBackground(context, state.loaded, state.elapsed)
            const attacker = state.loaded.opponentVariant || state.event?.type === 'player_attack' ? 'player' : 'enemy'
            paintMoveFrame(context, state.loaded, state.frames, attacker, sprites, tick)
          }
        }

        if (!attack || !state.loaded || state.finished) {
          for (const [side, sprite] of [['enemy', enemy], ['player', player]] as const) {
            const location = positions[side]
            const height = sprite.frames[tick % sprite.frames.length].sourceSize.h
            const kind = state.event?.type
            const hit = kind === `${side}_hit`
            let scale = 1
            let alpha = hit && Math.floor(state.elapsed / 90) % 2 === 0 ? .15 : 1
            let drop = 0
            if (side === 'player' && kind === 'switch_out') scale = Math.max(0, 1 - state.elapsed / 250)
            if (side === 'player' && kind === 'switch_in') scale = Math.min(1, state.elapsed / 250)
            if (side === 'enemy' && fainted.current) {
              const progress = kind === 'enemy_faint' ? Math.min(1, state.elapsed / 500) : 1
              drop = height * progress
              alpha = 1 - progress
            }
            context.save()
            context.globalAlpha = alpha
            context.translate(location.x + (side === 'player' ? -1 : 1) * entrance * 160, location.y + drop)
            context.scale(scale, scale)
            nativeSprite(context, sprite, tick, 0, -height / 2)
            context.restore()
          }
        }
        request = requestAnimationFrame(draw)
      }
      request = requestAnimationFrame(draw)
    }
    void load().catch(() => {
      if (!cancelled) setError('Battle graphics could not load. Please reload this page.')
    })
    return () => { cancelled = true; cancelAnimationFrame(request) }
  }, [playerId, enemyId])

  return <>
    <canvas ref={canvasRef} className="pokerogue-stage__canvas" width={BATTLE_WIDTH} height={BATTLE_HEIGHT} role="img" aria-label="Pokémon battle arena" />
    {error ? <p className="pokerogue-stage__error" role="status">{error}</p> : null}
  </>
}
