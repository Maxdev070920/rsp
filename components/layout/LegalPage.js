export default function LegalPage({ title, updated, intro, children }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-white sm:text-4xl">{title}</h1>
        {updated && <p className="mt-2 text-xs text-slate-500">Last updated {updated}</p>}
        {intro && <p className="mt-4 text-base leading-relaxed text-slate-300">{intro}</p>}
      </header>
      <div className="space-y-8">{children}</div>
    </article>
  );
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export function Bullets({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span aria-hidden="true" className="mt-0.5 text-aurora">
            ◆
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
