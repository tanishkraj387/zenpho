import { Component, type ErrorInfo, type ReactNode } from 'react'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Zenpho route crashed', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center bg-sky p-4 font-pixel text-ink">
          <section className="max-w-xl border-4 border-ink bg-cream p-5 shadow-[6px_6px_0_#1a1c2c]">
            <p className="font-heading text-[10px] uppercase leading-relaxed">
              Something broke
            </p>
            <p className="mt-3 text-xl leading-relaxed">
              The page hit an unexpected error. Your account data is still
              server-owned, so refresh and try the route again.
            </p>
            <button
              className="pixel-focus mt-4 border-4 border-ink bg-grass px-4 py-3 font-heading text-[10px] text-cream shadow-[4px_4px_0_#1a1c2c]"
              onClick={() => this.setState({ error: null })}
              type="button"
            >
              Retry
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
