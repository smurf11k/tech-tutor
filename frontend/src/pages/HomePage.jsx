import { useEffect, useState } from "react";
import { HashLink } from "@/components/common/HashLink";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  Code,
  Cpu,
  Database,
  Globe,
  Rocket,
  Search,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactSection } from "@/components/home/ContactSection";
import { CourseCard } from "@/components/common/CourseCard";
import { LoadingState } from "@/components/common/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { getDefaultRouteForUser } from "@/lib/navigation";
import { scrollToHash } from "@/lib/scroll";
import { extractList, getCourseRouteKey } from "@/lib/utils";
import { ChevronDown } from "lucide-react"; // add to existing lucide import
import { cn } from "@/lib/utils"; // add to existing utils import

const stats = [
  { value: "120+", label: "COURSES" },
  { value: "48k", label: "LEARNERS" },
  { value: "4.9", label: "AVG RATING" },
  { value: "94%", label: "COMPLETION" },
];

const tracks = [
  { icon: Globe, tag: "frontend", label: "Frontend Dev" },
  { icon: Database, tag: "backend", label: "Backend Eng." },
  { icon: Cpu, tag: "ml/ai", label: "ML & AI" },
  { icon: Terminal, tag: "devops", label: "Systems & Ops" },
];

// TODO: Replace these hardcoded testimonials with API data once testimonials endpoint is available.
const testimonials = [
  {
    initials: "SR",
    name: "Sofia Reyes",
    role: "// Frontend @ Stripe",
    quote:
      "TechTutor's structured paths helped me go from hobby scripts to landing a senior role. The project-based approach is the difference.",
  },
  {
    initials: "JO",
    name: "James Okafor",
    role: "// ML Eng @ DeepMind",
    quote:
      "The ML track is genuinely rigorous. Actual math, actual code, actual deployments. Not watered-down tutorials.",
  },
  {
    initials: "YP",
    name: "Yuna Park",
    role: "// Backend Lead @ Linear",
    quote:
      "Finished the backend path in 3 months while working full-time. Pacing and checkpoints kept me accountable the whole way.",
  },
];

const sidePanelStats = [
  { label: "// AVG RESPONSE", value: "~24h" },
  { label: "// SUPPORT HOURS", value: "Mon–Fri 9–18" },
  { label: "// LANGUAGES", value: "EN / UK" },
];

const sidePanelFaqs = [
  {
    q: "How fast do you reply?",
    a: "We aim to respond within 24h on weekdays. Complex issues may take a little longer.",
  },
  {
    q: "Billing or account issues?",
    a: "Include your account email and order ID if you have one — it speeds things up significantly.",
  },
  {
    q: "Want to teach here?",
    a: 'Select "Teach at Tech Tutor" as the subject and tell us about your background and topic ideas.',
  },
  {
    q: "Found a bug?",
    a: 'Select "Bug Report" and include steps to reproduce. Screenshots are a big help.',
  },
];

function ContactSidePanel() {
  const [openFaq, setOpenFaq] = useState(null);
  return (
    <div className="flex flex-col gap-6 pt-[122px]">
      <div className="space-y-3">
        {sidePanelStats.map((item) => (
          <div key={item.label} className="flex flex-col gap-0.5">
            <p className="text-[10px] tracking-[0.08em] text-[#444] mono-ui">
              {item.label}
            </p>
            <p className="text-[13px] font-medium text-[#d0d0d0] mono-ui">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      <div className="w-full h-px bg-border" />
      <div className="space-y-1">
        <p className="text-[10px] tracking-[0.12em] text-[#555] mono-ui uppercase mb-3">
          // BEFORE YOU WRITE
        </p>
        {sidePanelFaqs.map((item, index) => (
          <div
            key={item.q}
            className="border border-border rounded-md overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenFaq((c) => (c === index ? null : index))}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[#111]"
            >
              <span className="text-[11px] font-medium text-[#d0d0d0]">
                {item.q}
              </span>
              <ChevronDown
                className={cn(
                  "size-3 shrink-0 text-[#555] transition-transform duration-200",
                  openFaq === index && "rotate-180",
                )}
              />
            </button>
            {openFaq === index ? (
              <div className="border-t border-border bg-[#0a0a0a] px-3 py-2.5">
                <p className="text-[11px] leading-5 text-[#555] mono-ui">
                  {item.a}
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const dashboardPath = getDefaultRouteForUser(user);
  const location = useLocation();
  const [topCourses, setTopCourses] = useState([]);
  const [loadingTopCourses, setLoadingTopCourses] = useState(true);
  const [trackCounts, setTrackCounts] = useState({});

  function sortByRatingDescending(courses) {
    return [...courses].sort((left, right) => {
      const leftRating = Number(left?.average_rating ?? left?.rating ?? 0);
      const rightRating = Number(right?.average_rating ?? right?.rating ?? 0);

      if (rightRating !== leftRating) {
        return rightRating - leftRating;
      }

      const leftReviews = Number(left?.published_reviews_count ?? 0);
      const rightReviews = Number(right?.published_reviews_count ?? 0);

      if (rightReviews !== leftReviews) {
        return rightReviews - leftReviews;
      }

      return String(left?.title || "").localeCompare(
        String(right?.title || ""),
      );
    });
  }

  useEffect(() => {
    if (location.hash) {
      scrollToHash(location.hash);
    }
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;

    async function loadTopCourses() {
      setLoadingTopCourses(true);
      try {
        const response = await api.get("/courses", {
          params: {
            sort: "rating",
            per_page: 50,
          },
        });

        if (!cancelled) {
          setTopCourses(
            sortByRatingDescending(extractList(response.data)).slice(0, 3),
          );
        }
      } catch {
        if (!cancelled) {
          setTopCourses([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingTopCourses(false);
        }
      }
    }

    loadTopCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTrackCounts() {
      try {
        const responses = await Promise.all(
          tracks.map((track) =>
            api.get("/courses", {
              params: {
                category: track.tag,
                per_page: 1,
              },
            }),
          ),
        );

        if (!cancelled) {
          setTrackCounts(
            responses.reduce((accumulator, response, index) => {
              accumulator[tracks[index].tag] = Number(
                response.data?.total || 0,
              );
              return accumulator;
            }, {}),
          );
        }
      } catch {
        if (!cancelled) {
          setTrackCounts({});
        }
      }
    }

    loadTrackCounts();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-0">
      <section className="py-10">
        <div className="home-shell space-y-6">
          <div className="flex items-center gap-2 text-xs text-primary mono-ui">
            <span className="text-[#444]">~/techtutor</span>
            <span>$</span>
            <span>learn --track frontend --level beginner</span>
            <span className="inline-block h-3.5 w-2 animate-terminal-cursor bg-primary" />
          </div>

          <h1 className="text-[42px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#f0f0f0] md:text-[52px]">
            Code more.
            <br />
            Build <span className="text-primary">faster.</span>
            <br />
            Ship things.
          </h1>

          <p className="max-w-xl text-sm leading-7 text-[#666]">
            Structured programming courses built by engineers who still write
            code. No fluff. No theory-only. Just the path from zero to
            production.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {isAuthenticated ? (
              <Button asChild>
                <Link to={dashboardPath}>dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/register">get_started</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/courses">course_catalog</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex">
              {["SR", "JO", "YP", "AC", "MW"].map((tag, index) => (
                <div
                  key={tag}
                  className="-ml-2 flex size-[26px] items-center justify-center rounded-full border-2 border-background bg-[#1a1a1a] text-[9px] text-primary mono-ui first:ml-0"
                  style={{ zIndex: 10 - index }}
                >
                  {tag}
                </div>
              ))}
            </div>
            <p className="text-xs text-[#555] mono-ui">
              <strong className="font-semibold text-[#aaa]">48,000+</strong>{" "}
              devs enrolled this year
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-[#0a0a0a]">
        <div className="grid md:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={item.label}
              className={[
                "border-border px-5 py-5 text-center",
                index !== stats.length - 1
                  ? "border-b md:border-r md:border-b-0"
                  : "",
              ].join(" ")}
            >
              <p className="text-[22px] font-medium tracking-[-0.03em] text-[#f0f0f0] mono-ui">
                {item.value}
              </p>
              <p className="mt-1 text-[11px] tracking-[0.05em] text-[#3a3a3a] mono-ui">
                // {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="home-shell">
          <div className="mb-8">
            <div>
              <p className="text-[10px] tracking-[0.12em] text-primary mono-ui uppercase">
                // TRACKS
              </p>
              <h2 className="text-[18px] font-medium tracking-[-0.02em]">
                Learning paths
              </h2>
              <p className="mt-1 text-xs text-[#555] mono-ui">
                $ list --all-tracks
              </p>
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
            {tracks.map(({ icon: Icon, tag, label }) => (
              <article
                key={label}
                className="bg-background p-[18px] transition-colors hover:bg-[#111]"
              >
                <Icon className="mb-3 size-[18px] text-primary/80" />
                <span className="inline-flex rounded-[3px] border border-[#003a1a] bg-[#001a0d] px-1.5 py-0.5 text-[9px] tracking-[0.08em] text-primary mono-ui uppercase">
                  {tag}
                </span>
                <h3 className="mt-2 text-[13px] font-medium text-[#d0d0d0]">
                  {label}
                </h3>
                <p className="text-[11px] text-[#3a3a3a] mono-ui">
                  {String(trackCounts[tag] ?? 0)} courses
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="featured" className="py-2 pb-10">
        <div className="home-shell">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-[10px] tracking-[0.12em] text-primary mono-ui uppercase">
                // FEATURED
              </p>
              <h2 className="text-[18px] font-medium tracking-[-0.02em]">
                Top courses
              </h2>
              <p className="mt-1 text-xs text-[#555] mono-ui">
                $ sort --by rating --limit 3
              </p>
            </div>
            <Button variant="link" asChild>
              <Link
                to="/courses"
                className="inline-flex items-center gap-1 text-[11px] mono-ui"
              >
                view_all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {loadingTopCourses ? <LoadingState /> : null}

          {!loadingTopCourses ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {topCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  href={`/courses/${getCourseRouteKey(course)}`}
                  actionLabel="view_course"
                />
              ))}
            </div>
          ) : null}

          {!loadingTopCourses && topCourses.length === 0 ? (
            <p className="text-xs text-muted-foreground mono-ui">
              No published courses yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="my-10 border-y border-border bg-[#0a0a0a]">
        <div className="home-shell py-6">
          <p className="text-[10px] tracking-[0.12em] text-primary mono-ui uppercase">
            // PROCESS
          </p>
          <h2 className="text-[18px] font-medium tracking-[-0.02em]">
            How it works
          </h2>
        </div>

        <div className="home-shell grid gap-px bg-border md:grid-cols-3">
          {[
            {
              num: "01 //",
              title: "Pick a track",
              desc: "Choose a path. Each has a defined outcome and a real project at the end.",
              icon: BookOpen,
            },
            {
              num: "02 //",
              title: "Write code",
              desc: "Every module has exercises. You write actual code from lesson one.",
              icon: Code,
            },
            {
              num: "03 //",
              title: "Ship a project",
              desc: "Capstone project per track. Something real. Something you can show.",
              icon: Rocket,
            },
          ].map((step) => (
            <article key={step.num} className="bg-[#0a0a0a] p-5">
              <p className="text-[10px] tracking-[0.12em] text-primary mono-ui">
                {step.num}
              </p>
              <div className="mb-3 mt-2 inline-flex size-[34px] items-center justify-center rounded-md border border-border text-[#444]">
                <step.icon className="size-4" />
              </div>
              <h3 className="text-[13px] font-medium text-[#d0d0d0]">
                {step.title}
              </h3>
              <p className="mt-1 text-xs leading-6 text-[#444] mono-ui">
                {step.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-background pt-10 pb-10">
        <div className="home-shell">
          <div className="mb-8">
            <p className="text-[10px] tracking-[0.12em] text-primary mono-ui uppercase">
              // COMMUNITY
            </p>
            <h2 className="text-[18px] font-medium tracking-[-0.02em]">
              What people say
            </h2>
          </div>

          {/* TODO: Replace hardcoded testimonials with API data once testimonials endpoint is available. */}
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-3">
            {testimonials.map((item) => (
              <article
                key={item.name}
                className="flex flex-col gap-3 bg-background p-[18px]"
              >
                <p className="text-xs leading-7 text-[#555] mono-ui">
                  "{item.quote}"
                </p>
                <div className="flex items-center gap-2">
                  <span className="flex size-[26px] items-center justify-center rounded-full border border-border bg-[#111] text-[9px] text-primary mono-ui">
                    {item.initials}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-[#aaa]">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-[#3a3a3a] mono-ui">
                      {item.role}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="home-shell">
          <div className="relative overflow-hidden rounded-lg border border-border bg-[#0a0a0a] px-6 py-12 text-center">
            <div className="pointer-events-none absolute inset-0 mx-auto my-auto h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(0,229,116,0.04)_0%,transparent_70%)]" />
            <div className="relative z-10">
              <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-lg border border-[#003a1a] bg-[#001a0d] text-primary">
                <Terminal className="size-5" />
              </span>
              <h2 className="text-[22px] font-medium tracking-[-0.03em] text-[#f0f0f0]">
                Ready to initialize?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-7 text-[#444] mono-ui">
                $ create-account --plan free --no-credit-card
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/register">create_account</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/courses">explore_courses</Link>
                </Button>
              </div>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-[#2a2a2a] mono-ui">
                no credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="home-shell pb-10">
        <div className="grid gap-6 md:grid-cols-[1fr_260px] items-start">
          <ContactSection />
          <ContactSidePanel />
        </div>
      </div>
    </div>
  );
}
