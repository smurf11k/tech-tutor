import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { scrollToHash } from "@/lib/scroll";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, isAuthenticated, isAdmin, isInstructor } = useAuth();
  const location = useLocation();
  const profileImage = resolveBackendAssetUrl(user?.avatar_url);

  useEffect(() => {
    if (location.hash) {
      scrollToHash(location.hash);
    }
  }, [location.pathname, location.hash]);

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
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="
                  flex items-center justify-center
                  rounded-full
                  transition-all
                  hover:scale-[1.03]
                "
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt={user?.name || "Profile"}
                      className="
                      h-9 w-9
                      rounded-full
                      border border-border
                      object-cover
                    "
                    />
                  ) : (
                    <div
                      className="
                      flex h-9 w-9 items-center justify-center
                      rounded-full
                      border border-border
                      bg-muted
                      text-[12px]
                      font-semibold
                      text-muted-foreground
                      mono-ui
                      transition-colors
                      hover:border-border
                      hover:bg-muted/80
                    "
                    >
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
