import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({ title, description, children, footer }) {
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center justify-center px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 tech-grid opacity-40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      <div className="relative w-full max-w-md space-y-6">
        <Link
          to="/"
          className="mx-auto flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <BookOpen className="size-4 text-primary" />
          TechTutor
        </Link>

        <Card className="glass-panel border-primary/20 shadow-xl shadow-primary/5">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>

        {footer ? <div className="text-center text-sm">{footer}</div> : null}
      </div>
    </section>
  );
}
