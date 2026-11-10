export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }
  if (value.length > 2000) return fallback;
  return value;
}

export function signInPath(next = "/dashboard", error?: string): string {
  const params = new URLSearchParams();
  params.set("next", safeNextPath(next, "/dashboard"));
  if (error) params.set("error", error);
  return `/auth/sign-in?${params.toString()}`;
}

export function dashboardHome(role: "customer" | "owner" | "admin", ownerStatus: string): string {
  if (role === "admin") return "/admin";
  if (role === "owner" && ownerStatus === "approved") return "/owner";
  return "/dashboard";
}
