/* A stand-in page: a header, a search field, filters, a list of cards. */
export default async function ArrivalReviewPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  // Discover is slow on purpose: its outline goes up first.
  if (page === "discover") await new Promise(resolve => setTimeout(resolve, 900));
  const title = page.charAt(0).toUpperCase() + page.slice(1);
  return (
    <main className="mx-auto w-full max-w-xl px-4 pt-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-ink-soft">Exchange Notes</p>
        <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
      </header>
      <div className="mt-5 h-[52px] rounded-full bg-black/[0.05] px-5 py-4 text-sm text-ink-soft">Search…</div>
      <div className="mt-4 flex gap-2">
        {["All", "New", "Learning", "Mastered"].map(pill => (
          <span key={pill} className="rounded-full bg-black/[0.06] px-4 py-2 text-sm">{pill}</span>
        ))}
      </div>
      <ul className="mt-5 space-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-medium">{title} item {index + 1}</p>
            <p className="text-sm text-ink-soft">A line of supporting text for this card.</p>
          </li>
        ))}
      </ul>
      {page === "messages" && (
        <div data-arrival-composer="" className="fixed inset-x-4 bottom-20 rounded-full bg-black px-5 py-3 text-sm text-white">
          Write a message…
        </div>
      )}
    </main>
  );
}
