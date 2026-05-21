export function PageHeader({ title, description, actions }) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <section>
        <h1 className="page-title">{title}</h1>
        {description ? (
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>
        ) : null}
      </section>
      {actions ? (
        <section className="flex flex-wrap gap-2">{actions}</section>
      ) : null}
    </header>
  );
}
