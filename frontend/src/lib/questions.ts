import questionsData from '../data/questions.json'
import {
  getEncounterPool,
  getPokemonWithSprites,
  type PokemonSpecies,
  type PokemonSpeciesWithSprites,
  type QuestionDifficulty,
  type TopicType,
} from './pokemon'

export type CodeLanguage = 'python' | 'javascript'

export type CodingQuestion = {
  id: string
  title: string
  difficulty: QuestionDifficulty
  topic: TopicType
  description: string
  examples: {
    input: string
    output: string
  }[]
  starterCode: Record<CodeLanguage, string>
}

export type QuestionEncounter = {
  question: CodingQuestion
  pokemon: PokemonSpeciesWithSprites
  routeName: string
}

const topicTypePreference: Record<TopicType, string[]> = {
  arrays: ['Normal', 'Grass', 'Water', 'Fighting'],
  strings: ['Normal', 'Psychic', 'Fairy'],
  graphs: ['Electric', 'Ghost', 'Psychic', 'Flying'],
  trees: ['Grass', 'Bug', 'Ground', 'Rock'],
  dp: ['Psychic', 'Dragon', 'Water'],
  math: ['Rock', 'Electric', 'Psychic', 'Steel'],
}

const routeNames: Record<TopicType, string> = {
  arrays: 'Array Grove',
  strings: 'Cipher Coast',
  graphs: 'Signal Cave',
  trees: 'Rootwood Trail',
  dp: 'Memo Marsh',
  math: 'Prime Peak',
}

export const codingQuestions = questionsData as CodingQuestion[]

const topicHints: Record<TopicType, string[]> = {
  arrays: [
    'Track the best state as you scan from left to right.',
    'Think about what information must survive between indices.',
    'Samples prove shape; hidden tests usually check empty, tiny, and negative cases.',
  ],
  strings: [
    'Normalize the input before comparing patterns.',
    'A frequency map or sorted key can turn messy text into a stable signal.',
    'Watch punctuation, casing, and repeated characters.',
  ],
  graphs: [
    'Model each reachable state clearly before choosing BFS, DFS, or a priority queue.',
    'Mark visited nodes at the moment they become committed.',
    'Disconnected components and cycles are the usual hidden traps.',
  ],
  trees: [
    'Decide whether the answer belongs to each node, each level, or each path.',
    'A queue helps when the problem talks about levels.',
    'Null gaps and single-node trees should still produce a valid answer.',
  ],
  dp: [
    'Name the state before writing transitions.',
    'Decide whether order matters; that changes the loop direction.',
    'Efficiency tests usually punish recomputing the same subproblem.',
  ],
  math: [
    'Look for a way to precompute repeated work.',
    'Check boundary values before optimizing.',
    'Large inputs usually need arithmetic or prefix counts instead of simulation.',
  ],
}

function hashText(value: string) {
  return value.split('').reduce((total, character) => {
    return (total * 31 + character.charCodeAt(0)) % 9973
  }, 17)
}

function scoreTopicMatch(pokemon: PokemonSpecies, topic: TopicType) {
  const preferredTypes = topicTypePreference[topic]

  return pokemon.types.filter((type) => preferredTypes.includes(type)).length
}

export function getQuestionById(id: string) {
  return codingQuestions.find((question) => question.id === id)
}

export function getQuestionsByDifficulty(difficulty: QuestionDifficulty) {
  return codingQuestions.filter((question) => question.difficulty === difficulty)
}

export function getQuestionsByTopic(topic: TopicType) {
  return codingQuestions.filter((question) => question.topic === topic)
}

export function getEncounterForQuestion(question: CodingQuestion): QuestionEncounter {
  const pool = getEncounterPool(question.difficulty)
  const matchingPool = pool.filter((pokemon) => scoreTopicMatch(pokemon, question.topic) > 0)
  const candidates = matchingPool.length > 0 ? matchingPool : pool
  const index = hashText(question.id) % candidates.length

  return {
    question,
    pokemon: getPokemonWithSprites(candidates[index]),
    routeName: routeNames[question.topic],
  }
}

export function getQuestionEncounters() {
  return codingQuestions.map(getEncounterForQuestion)
}

export function getTopicLabel(topic: TopicType) {
  if (topic === 'dp') {
    return 'DP'
  }

  return topic.charAt(0).toUpperCase() + topic.slice(1)
}

export function getQuestionHints(question: CodingQuestion) {
  return topicHints[question.topic]
}
