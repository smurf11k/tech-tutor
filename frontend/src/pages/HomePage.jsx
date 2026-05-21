import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { HashLink } from "@/components/common/HashLink";
import { scrollToHash } from "@/lib/scroll";
import { GraduationCap, Layers, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CatalogSection } from "@/components/home/CatalogSection";
import { ContactSection } from "@/components/home/ContactSection";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRouteForUser } from "@/lib/navigation";

const highlights = [
  {
    icon: GraduationCap,
    title: "Structured learning",
    description:
      "Follow modules, complete lessons, and track progress toward certificates.",
  },
  {
    icon: Layers,
    title: "Quizzes and practice",
    description:
      "Reinforce each topic with quizzes designed to check your understanding.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted platform",
    description:
      "Reviews, moderation, and role-based dashboards for students and staff.",
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const dashboardPath = getDefaultRouteForUser(user);

  useEffect(() => {
    if (location.hash) {
      scrollToHash(location.hash);
    }
  }, [location.hash]);

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 glass-panel px-6 py-12 md:px-10 md:py-16">
        <div className="relative z-10 max-w-2xl space-y-6">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            TechTutor
          </p>
          <h1 className="page-title text-3xl md:text-4xl">
            Learn tech skills with guided courses
          </h1>
          <p className="text-muted-foreground">
            Explore the catalog, enroll in courses, complete lessons and quizzes,
            and earn certificates — whether you are just starting out or levelling
            up your career.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <HashLink to="/#catalog">Browse courses</HashLink>
            </Button>
            {isAuthenticated ? (
              <Button asChild variant="outline" size="lg">
                <Link to={dashboardPath}>Go to dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" size="lg">
                <Link to="/register">Create free account</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="glass-panel">
            <CardContent className="space-y-3 pt-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" />
              </span>
              <h2 className="font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <CatalogSection />
      <ContactSection />
    </div>
  );
}
