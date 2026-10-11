import type { CodeLanguage } from './questions'
import { isSupabaseConfigured, supabase } from './supabase'

export type BattleAttemptRecord = {
  id: string
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
