import { isSupabaseConfigured, supabase } from './supabase'

const localSolvedKey = 'zenpho-solved-questions'

function readLocalSolvedQuestions() {
  try {
    const value = localStorage.getItem(localSolvedKey)
    const parsed = value ? (JSON.parse(value) as unknown) : []

    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function writeLocalSolvedQuestions(questionIds: string[]) {
  localStorage.setItem(localSolvedKey, JSON.stringify([...new Set(questionIds)]))
}

export function markQuestionSolvedLocally(questionId: string) {
  if (isSupabaseConfigured) return
  writeLocalSolvedQuestions([...readLocalSolvedQuestions(), questionId])
}

export async function getSolvedQuestionIds(userId: string) {
  if (!isSupabaseConfigured) {
    return readLocalSolvedQuestions()
  }

  const { data, error } = await supabase
    .from('battle_attempts')
    .select('question_id')
    .eq('user_id', userId)
    .eq('sample_status', 'passed')
    .eq('hidden_status', 'passed')
    .eq('efficiency_status', 'passed')

  if (error) {
    throw error
  }

  return [...new Set((data ?? []).map((attempt) => attempt.question_id).filter(Boolean))]
}
