import { Link } from "react-router-dom";
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
      { label: "Billing", to: "/profile#billing", hash: false },
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
    <footer className="border-t border-border bg-[#0a0a0a]">
      <div className="home-shell py-10">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <section className="space-y-3">
            <Link
              to="/"
              className="flex items-center gap-2 text-[13px] font-medium tracking-[-0.01em]"
            >
              <img
                src="/favicon.svg"
                alt="TechTutor"
                className="h-5 w-5 p-[2px]"
              />
              TechTutor
            </Link>
            <p className="max-w-xs text-[11px] leading-7 text-[#3a3a3a] mono-ui">
              Learn practical tech skills with structured courses, quizzes, and
              certificates.
            </p>
          </section>
          {footerLinks.map((group) => (
            <section key={group.title}>
              <h3 className="mb-3 text-[11px] font-medium tracking-[0.06em] text-[#555] mono-ui uppercase">
                {group.title}
              </h3>
              <ul className="space-y-2 text-[11px] text-[#2f2f2f] mono-ui">
                {group.links.map((link) => (
                  <li key={link.label}>
                    {link.hash ? (
                      <HashLink
                        to={link.to}
                        className="transition-colors hover:text-[#aaa]"
                      >
                        {link.label}
                      </HashLink>
                    ) : (
                      <Link
                        to={link.to}
                        className="transition-colors hover:text-[#aaa]"
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
        <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-[11px] text-[#2f2f2f] mono-ui sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} TechTutor. All rights reserved.</p>
          <p>Built for learners, instructors, and platform admins.</p>
        </div>
      </div>
    </footer>
  );
}
