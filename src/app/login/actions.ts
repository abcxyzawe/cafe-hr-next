"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clearSessionCookie,
  setSessionCookie,
  signSession,
} from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { rateLimit, gcRateLimit } from "@/lib/rate-limit";
import { getLocale, translate } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được trống"),
});

export type LoginState = {
  ok: boolean;
  error?: string;
};

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const locale = await getLocale();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ";
    return { ok: false, error: msg };
  }

  // Rate limit by (email + IP) to mitigate brute force without locking out shared IPs entirely
  gcRateLimit();
  const ip = await clientIp();
  const rlKey = `login:${parsed.data.email.toLowerCase()}:${ip}`;
  const rl = rateLimit({ key: rlKey, max: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return {
      ok: false,
      error: translate(locale, "login.errorTooMany", { seconds: rl.retryAfter }),
    };
  }

  let next = String(formData.get("next") || "/");
  if (!next.startsWith("/") || next.startsWith("//")) next = "/";

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
    });
    if (!user) {
      return { ok: false, error: translate(locale, "login.errorInvalid") };
    }
    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return { ok: false, error: translate(locale, "login.errorInvalid") };
    }

    const token = await signSession({
      uid: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await logActivity({
      action: "user.login",
      summary: `${user.name} đã đăng nhập`,
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đăng nhập" };
  }

  redirect(next);
}

export async function signOut() {
  await logActivity({ action: "user.logout", summary: "Đăng xuất" });
  await clearSessionCookie();
  redirect("/login");
}
