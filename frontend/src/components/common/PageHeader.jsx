export function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <section>
        <p className="text-[10px] tracking-[0.12em] text-primary/70 mono-ui uppercase">
          // PAGE
        </p>
        <h1 className="page-title">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs text-[#555] mono-ui">
            {description}
          </p>
        ) : null}
      </section>
      {actions ? (
        <section className="flex flex-wrap gap-2">{actions}</section>
      ) : null}
    </header>
  );
}
