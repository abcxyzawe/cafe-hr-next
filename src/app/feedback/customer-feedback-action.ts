"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { logActivity } from "@/lib/activity";

const CustomerFeedbackInput = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(1000),
  name: z.string().max(100).optional(),
  contact: z.string().max(100).optional(),
  // Honeypot — must be empty
  website: z.string().max(200).optional(),
});

export type CustomerFeedbackResult = { ok: boolean; error?: string };

// In-memory rate-limit map: ip -> last submission timestamp (ms)
const RATE_LIMIT_WINDOW_MS = 30_000;
const lastByIp = new Map<string, number>();

function clientIp(forwardedFor: string | null, realIp: string | null): string {
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  if (realIp) return realIp;
  return "unknown";
}

export async function submitCustomerFeedback(input: {
  rating: number;
  comment: string;
  name?: string;
  contact?: string;
  website?: string;
}): Promise<CustomerFeedbackResult> {
  const parsed = CustomerFeedbackInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Vui lòng kiểm tra lại nội dung (5–1000 ký tự, sao 1–5)" };
  }

  const { rating, comment, name, contact, website } = parsed.data;

  // Honeypot — silently drop
  if (website && website.trim().length > 0) {
    return { ok: false, error: "Spam detected" };
  }

  // Rate-limit by IP (best-effort; in-memory)
  try {
    const h = await headers();
    const ip = clientIp(h.get("x-forwarded-for"), h.get("x-real-ip"));
    const now = Date.now();
    const last = lastByIp.get(ip);
    if (last && now - last < RATE_LIMIT_WINDOW_MS) {
      return {
        ok: false,
        error: "Bạn vừa gửi phản hồi — vui lòng đợi vài giây rồi thử lại.",
      };
    }
    lastByIp.set(ip, now);
    // Opportunistic cleanup so the map doesn't grow unbounded
    if (lastByIp.size > 5000) {
      for (const [k, ts] of lastByIp) {
        if (now - ts > RATE_LIMIT_WINDOW_MS * 10) lastByIp.delete(k);
      }
    }
  } catch {
    // headers() unavailable — proceed without rate-limit
  }

  const trimmedName = name?.trim() || "";
  const trimmedContact = contact?.trim() || "";
  const displayName = trimmedName || "Khách ẩn danh";
  const snippet =
    comment.length > 80 ? `${comment.slice(0, 80)}…` : comment;

  try {
    await logActivity({
      action: "customer.feedback",
      summary: `★ ${rating}/5 từ ${displayName}: ${snippet}`,
      metadata: {
        rating,
        comment,
        name: trimmedName || null,
        contact: trimmedContact || null,
      },
    });
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}
