"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const SIDEBAR_COOKIE = "cafe-hr-sidebar-collapsed";

export async function getSidebarCollapsed(): Promise<boolean> {
  const c = await cookies();
  return c.get(SIDEBAR_COOKIE)?.value === "1";
}

export async function setSidebarCollapsed(collapsed: boolean) {
  const c = await cookies();
  c.set(SIDEBAR_COOKIE, collapsed ? "1" : "0", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
