import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { HashLink } from "@/components/common/HashLink";

const footerLinks = [
  {
    title: "Platform",
    links: [
      { label: "Home", to: "/", hash: false },
      { label: "Course catalog", to: "/#catalog", hash: true },
      { label: "My learning", to: "/learning", hash: false },
      { label: "Certificates", to: "/certificates", hash: false },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log in", to: "/login", hash: false },
      { label: "Sign up", to: "/register", hash: false },
      { label: "Profile", to: "/profile", hash: false },
      { label: "Payments", to: "/payments", hash: false },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Contact us", to: "/#contact", hash: true },
      { label: "Forgot password", to: "/forgot-password", hash: false },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-card/30">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <section className="space-y-3">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <BookOpen className="size-4" />
              </span>
              Tech<span className="text-primary">Tutor</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Learn practical tech skills with structured courses, quizzes, and
              certificates.
            </p>
          </section>
          {footerLinks.map((group) => (
            <section key={group.title}>
              <h3 className="mb-3 text-sm font-semibold">{group.title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.hash ? (
                      <HashLink
                        to={link.to}
                        className="transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </HashLink>
                    ) : (
                      <Link
                        to={link.to}
                        className="transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} TechTutor. All rights reserved.</p>
          <p>Built for learners, instructors, and platform admins.</p>
        </div>
      </div>
    </footer>
  );
}
