export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <section className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
          Drink Warner
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl">
          Your drink awareness app
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base leading-7 text-zinc-600">
          Next.js project is ready. Start building the drink tracking and warning experience here.
        </p>
      </section>
    </main>
  );
}
