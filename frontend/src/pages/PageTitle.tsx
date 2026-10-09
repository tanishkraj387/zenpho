type PageTitleProps = {
  title: string
}

export function PageTitle({ title }: PageTitleProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-50">
      <h1 className="text-4xl font-semibold">{title}</h1>
    </main>
  )
}
