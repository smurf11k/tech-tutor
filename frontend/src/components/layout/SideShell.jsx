import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export function SideShell({ title, menu = [], children }) {
  const linkClass = ({ isActive }) =>
    cn(
      "block rounded-md px-3 py-2 text-sm transition-colors",
      isActive
        ? "bg-primary/15 text-primary shadow-inner shadow-primary/10"
        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
    );

  return (
    <section className="container">
      <div className="flex gap-6">
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{title}</h3>
            <nav className="flex flex-col gap-1">
              {menu.map((item) => (
                <NavLink key={item.to} to={item.to} className={linkClass} end>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        <main className="flex-1">{children || <Outlet />}</main>
      </div>
    </section>
  );
}

export default SideShell;
