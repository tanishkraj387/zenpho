import { Link } from 'react-router-dom'
import { AppHeader } from '../components/auth/AppHeader'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'
import { Sprite } from '../components/ui/Sprite'
import { TypeBadge, type TopicType as BadgeTopicType } from '../components/ui/TypeBadge'
import {
  getQuestionEncounters,
  getTopicLabel,
  type CodingQuestion,
} from '../lib/questions'
import { getRarityLabel, type QuestionDifficulty, type TopicType } from '../lib/pokemon'

const difficultyClasses: Record<QuestionDifficulty, string> = {
  easy: 'bg-grass text-cream',
  medium: 'bg-warning text-ink',
  hard: 'bg-danger text-cream',
}

function getBadgeTopic(topic: TopicType): BadgeTopicType {
  const label = getTopicLabel(topic)

  return label as BadgeTopicType
}

function getEnergyCost(question: CodingQuestion) {
  if (question.difficulty === 'hard') {
    return 8
  }

  if (question.difficulty === 'medium') {
    return 5
  }

  return 3
}

export function Practice() {
  const encounters = getQuestionEncounters()

  return (
    <main className="min-h-screen bg-sky font-pixel text-ink">
      <AppHeader coins={245} />
      <section className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <PixelCard bodyClassName="p-4 sm:p-5" title="Practice Routes">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-3">
              <p className="font-heading text-[10px] uppercase leading-relaxed">
                Question encounters
              </p>
              <h1 className="font-heading text-2xl leading-relaxed sm:text-3xl">
                Pick a route, meet a Pokemon
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed">
                These are the first local seed questions. Each one maps to a
                deterministic wild Pokemon using difficulty, topic, and rarity
                rules.
              </p>
            </div>
            <Link to="/battle">
              <PixelButton className="w-full sm:w-auto">Battle Prototype</PixelButton>
            </Link>
          </div>
        </PixelCard>

        <div className="grid gap-4 xl:grid-cols-2">
          {encounters.map(({ pokemon, question, routeName }) => (
            <article
              className="grid gap-4 border-4 border-ink bg-cream p-4 shadow-[6px_6px_0_#1a1c2c] md:grid-cols-[104px_1fr]"
              key={question.id}
            >
              <div className="flex h-28 items-center justify-center border-4 border-ink bg-white">
                <Sprite
                  alt={`${pokemon.name} front sprite`}
                  className="h-24 w-24 object-contain"
                  id={pokemon.id}
                  type="front"
                />
              </div>

              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`border-4 border-ink px-2 py-1 font-heading text-[9px] uppercase ${difficultyClasses[question.difficulty]}`}
                  >
                    {question.difficulty}
                  </span>
                  <TypeBadge type={getBadgeTopic(question.topic)} />
                  <span className="border-4 border-ink bg-white px-2 py-1 font-heading text-[9px] uppercase">
                    {routeName}
                  </span>
                </div>

                <div>
                  <h2 className="font-heading text-sm leading-relaxed">{question.title}</h2>
                  <p className="mt-2 text-xl leading-relaxed">{question.description}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div className="text-lg">
                    <p>
                      Wild encounter:{' '}
                      <span className="font-heading text-[10px]">{pokemon.name}</span>
                    </p>
                    <p>
                      Rarity: {getRarityLabel(pokemon.rarity)} / Energy cost:{' '}
                      {getEnergyCost(question)}
                    </p>
                    <p>Checkpoint groups: samples, hidden, efficiency</p>
                  </div>
                  <Link to={`/battle?question=${question.id}`}>
                    <PixelButton className="w-full sm:w-auto" variant="secondary">
                      Select
                    </PixelButton>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
