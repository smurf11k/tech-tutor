export function getDefaultRouteForUser(user) {
  if (!user?.role) {
    return "/";
  }

  switch (user.role) {
    case "admin":
      return "/admin";
    case "instructor":
      return "/instructor";
    case "student":
    default:
      return "/learning";
  }
}

export function resolvePostAuthPath(user, fromPathname) {
  if (fromPathname && fromPathname !== "/login" && fromPathname !== "/register") {
    return fromPathname;
  }

  return getDefaultRouteForUser(user);
}
