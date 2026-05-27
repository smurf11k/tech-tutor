import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export function SideShell({ title, menu = [], children }) {
  const linkClass = ({ isActive }) =>
    cn(
      "flex items-center gap-2 border-l-2 border-transparent px-3 py-2 text-[12px] transition-colors mono-ui",
      isActive
        ? "border-l-primary bg-[#001a0d] text-primary"
        : "text-muted-foreground hover:bg-[#111] hover:text-foreground",
    );

  return (
    <section className="w-full">
      <div className="grid min-h-[calc(100vh-132px)] gap-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-6">
        <aside className="hidden shrink-0 border-r border-border bg-card md:block">
          <div className="sticky top-[52px] h-[calc(100vh-52px)] overflow-y-auto p-0">
            <p className="px-3.5 pb-2 pt-3 text-[9px] tracking-[0.1em] text-[#3a3a3a] mono-ui uppercase">
              {title} Panel
            </p>
            <nav className="flex flex-col gap-1">
              {menu.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass} end>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 px-0 py-6 md:pr-6">
          {children || <Outlet />}
        </main>
      </div>
    </section>
  );
}

export default SideShell;
