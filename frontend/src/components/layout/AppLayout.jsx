import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { scrollToHash } from "@/lib/scroll";
import { BookOpen, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navLinkClass = ({ isActive }) =>
  cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary/15 text-primary shadow-inner shadow-primary/10"
      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  );

export function AppLayout() {
  const { user, isAuthenticated, isAdmin, isInstructor, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const THEME_STORAGE_KEY = "tech-tutor-theme";
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === "light" ? "light" : "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (location.hash) {
      scrollToHash(location.hash);
    }
  }, [location.pathname, location.hash]);

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="relative flex min-h-screen flex-col text-foreground">
      <div
        className="pointer-events-none fixed inset-0 tech-grid opacity-30"
        aria-hidden
      />

      <header className="sticky top-0 z-50 border-b border-border/60 glass-panel">
        <div className="container flex items-center gap-4 py-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 font-semibold tracking-tight"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <BookOpen className="size-4" />
              </span>
              <span>
                Tech<span className="text-primary">Tutor</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 flex justify-center">
            <div className="flex flex-wrap items-center gap-1">
              <NavLink to="/" className={navLinkClass} end>
                Home
              </NavLink>
              {isAuthenticated ? (
                <>
                  <NavLink to="/learning" className={navLinkClass}>
                    My learning
                  </NavLink>
                  <NavLink to="/certificates" className={navLinkClass}>
                    Certificates
                  </NavLink>
                  <NavLink to="/payments" className={navLinkClass}>
                    Payments
                  </NavLink>
                </>
              ) : null}
              {isInstructor ? (
                <NavLink to="/instructor" className={navLinkClass}>
                  Instructor
                </NavLink>
              ) : null}
              {isAdmin ? (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[var(--radius)]"
              onClick={() =>
                setTheme((p) => (p === "light" ? "dark" : "light"))
              }
            >
              {theme === "light" ? (
                <>
                  <Moon className="h-4 w-4" />
                  Dark
                </>
              ) : (
                <>
                  <Sun className="h-4 w-4" />
                  Light
                </>
              )}
            </Button>

            {isAuthenticated ? (
              <>
                <Badge variant="outline" className="text-xs capitalize">
                  {isAdmin ? "admin" : isInstructor ? "instructor" : "user"}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/profile">
                    <User className="mr-1 size-4" />
                    {user.name}
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/register">Sign up</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container relative flex-1 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
