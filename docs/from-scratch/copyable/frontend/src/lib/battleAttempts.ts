import type { CodeLanguage } from './questions'
import type { BattleEvent } from '../store/battleStore'
import { isSupabaseConfigured, supabase } from './supabase'

export type BattleAttemptRecord = {
  id: string
}

export type BattleActionResult = {
  events: BattleEvent[]
  enemyHp: number
  playerHp: number
  activeCreatureId: string
  outcome: 'won' | 'lost' | null
  needsSwitch: boolean
}

export type TestGroupStatus = 'pending' | 'passed' | 'failed'
export type BattleAttemptStatus = 'started' | 'running' | 'submitted' | 'won' | 'lost' | 'abandoned'

export async function startBattleAttempt({
  language,
  pokemonId,
  questionId,
}: {
  language: CodeLanguage
  pokemonId: number
  questionId: string
}) {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data, error } = await supabase.rpc('start_battle', {
    p_language: language,
    p_pokemon_id: pokemonId,
    p_question_id: questionId,
  })

  if (error) {
    throw error
  }

  return data as BattleAttemptRecord | null
}

export async function spendBattleEnergy(attemptId: string) {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data, error } = await supabase.rpc('spend_battle_energy', {
    p_battle_attempt_id: attemptId,
  })

  if (error) throw error
  return data as number
}

export async function takeBattleAction({
  attemptId,
  action,
  moveName = null,
  creatureId = null,
  itemKey = null,
}: {
  attemptId: string
  action: 'move' | 'switch' | 'item'
  moveName?: string | null
  creatureId?: string | null
  itemKey?: string | null
}): Promise<BattleActionResult> {
  if (!isSupabaseConfigured) throw new Error('Battle server is unavailable.')
  const { data, error } = await supabase.rpc('take_battle_action', {
    p_battle_attempt_id: attemptId,
    p_action: action,
    p_move_name: moveName,
    p_creature_id: creatureId,
    p_item_key: itemKey,
  })
  if (error) throw error
  if (!data || !Array.isArray(data.events)) throw new Error('Battle response was invalid.')
  return data as BattleActionResult
}

export async function recordBattleResult({
  attemptId,
  codeDraft,
  efficiencyStatus,
  enemyHp,
  hiddenStatus,
  language,
  playerHp,
  sampleStatus,
  status,
}: {
  attemptId: string
  codeDraft: string
  efficiencyStatus: TestGroupStatus
  enemyHp: number
  hiddenStatus: TestGroupStatus
  language: CodeLanguage
  playerHp: number
  sampleStatus: TestGroupStatus
  status: BattleAttemptStatus
}) {
  if (!isSupabaseConfigured) {
    return null
  }

  const { data, error } = await supabase.rpc('record_battle_result', {
    p_battle_attempt_id: attemptId,
    p_code_draft: codeDraft,
    p_efficiency_status: efficiencyStatus,
    p_enemy_hp: enemyHp,
    p_hidden_status: hiddenStatus,
    p_language: language,
    p_player_hp: playerHp,
    p_sample_status: sampleStatus,
    p_status: status,
  })

  if (error) {
    throw error
  }

  return data
}
