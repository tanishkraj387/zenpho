import { Link } from 'react-router-dom'
import { PixelButton } from '../components/ui/PixelButton'
import { PixelCard } from '../components/ui/PixelCard'

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-sky p-4 font-pixel text-ink">
      <PixelCard bodyClassName="space-y-4 p-5" title="Route Missing">
        <h1 className="font-heading text-xl leading-relaxed">No route here</h1>
        <p className="text-xl leading-relaxed">
          This path is not mapped to a Zenpho screen yet.
        </p>
        <Link to="/hub">
          <PixelButton>Back to Hub</PixelButton>
        </Link>
      </PixelCard>
    </main>
  )
}
