import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { scrollToHash } from "@/lib/scroll";
import { Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { resolveBackendAssetUrl } from "@/lib/api";

const navLinkClass = ({ isActive }) =>
  cn(
    "rounded-[5px] px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors mono-ui",
    isActive
      ? "border border-[#003a1a] bg-[#001a0d] text-primary"
      : "hover:bg-[#111] hover:text-foreground",
  );

export function AppLayout() {
  const { user, isAuthenticated, isAdmin, isInstructor, client, token } =
    useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const profileImage = resolveBackendAssetUrl(user?.avatar_url);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (location.hash) {
      scrollToHash(location.hash);
    }
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!location.pathname.startsWith("/courses")) {
      return;
    }

    const params = new URLSearchParams(location.search);
    setCatalogQuery(params.get("q") || "");
  }, [location.pathname, location.search]);

  async function handleCatalogSearchSubmit(event) {
    event.preventDefault();

    const query = catalogQuery.trim();
    if (!query) {
      navigate("/courses");
      return;
    }

    setSearching(true);

    try {
      const searchClient = token ? client : api;
      const response = await searchClient.get("/search", {
        params: { q: query },
      });

      if (response.data?.url) {
        navigate(response.data.url);
        return;
      }

      navigate(`/courses?q=${encodeURIComponent(query)}`);
    } catch (error) {
      const message =
        error?.response?.status === 404
          ? error?.response?.data?.message || "Searched thing not found."
          : "Search is temporarily unavailable. Showing course results instead.";

      if (error?.response?.status === 404) {
        toast.error(message);
        navigate(`/courses?q=${encodeURIComponent(query)}`);
      } else {
        toast.error(message);
        navigate(`/courses?q=${encodeURIComponent(query)}`);
      }
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col text-foreground">
      <div
        className="pointer-events-none fixed inset-0 tech-grid opacity-20"
        aria-hidden
      />

      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="home-shell flex h-[52px] items-center gap-4">
          <div className="flex items-center gap-5">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/favicon.svg"
                alt="TechTutor"
                className="h-5 w-5 p-[2px]"
              />
              <span className="text-[13px] font-medium tracking-[-0.01em]">
                TechTutor
              </span>
            </Link>

            <nav className="hidden items-center gap-1 sm:flex">
              <NavLink to="/" className={navLinkClass} end>
                home
              </NavLink>
              <NavLink to="/courses" className={navLinkClass}>
                courses
              </NavLink>
              {isAuthenticated ? (
                <>
                  <NavLink to="/learning" className={navLinkClass}>
                    learning
                  </NavLink>
                  <NavLink to="/certificates" className={navLinkClass}>
                    certificates
                  </NavLink>
                </>
              ) : null}
              {isInstructor ? (
                <NavLink to="/instructor" className={navLinkClass}>
                  instructor
                </NavLink>
              ) : null}
              {isAdmin ? (
                <NavLink to="/admin" className={navLinkClass}>
                  admin
                </NavLink>
              ) : null}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <form
              className="w-full max-w-[170px] sm:max-w-[260px]"
              onSubmit={handleCatalogSearchSubmit}
            >
              <label htmlFor="global-course-search" className="sr-only">
                Search courses
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="global-course-search"
                  value={catalogQuery}
                  onChange={(event) => setCatalogQuery(event.target.value)}
                  placeholder="Search courses and lessons"
                  className="h-8 pl-8 text-xs"
                  disabled={searching}
                />
              </div>
            </form>

            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background p-0 transition-all hover:scale-[1.03]"
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={user?.name || "Profile"}
                      className="size-full rounded-none object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-muted text-[12px] font-semibold text-muted-foreground mono-ui transition-colors hover:bg-muted/80">
                      {(user?.name || "TT")
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </Link>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">sign_in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">get_started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
