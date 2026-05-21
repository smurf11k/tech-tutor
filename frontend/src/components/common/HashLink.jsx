import { Link, useLocation, useNavigate } from "react-router-dom";
import { scrollToHash } from "@/lib/scroll";

export function HashLink({ to, children, className, onClick, ...props }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [path = "/", hash = ""] = to.includes("#") ? to.split("#") : [to, ""];
  const targetPath = path || "/";
  const hashValue = hash ? `#${hash}` : "";

  function handleClick(event) {
    onClick?.(event);
    if (event.defaultPrevented) {
      return;
    }

    if (!hash) {
      return;
    }

    if (location.pathname === targetPath) {
      event.preventDefault();
      window.history.replaceState(null, "", `${targetPath}${hashValue}`);
      scrollToHash(hashValue);
      return;
    }

    event.preventDefault();
    navigate(`${targetPath}${hashValue}`);
  }

  return (
    <Link to={`${targetPath}${hashValue}`} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
