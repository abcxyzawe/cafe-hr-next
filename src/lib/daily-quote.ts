import "server-only";
import { prisma } from "./prisma";
import { generateDailyQuote } from "./xai";

const FALLBACK_QUOTES = [
  "Mỗi tách cà phê là một nụ cười nhỏ gửi đến khách hôm nay ☕",
  "Đam mê pha cà phê khác đam mê uống — và bạn đang ở đúng phía của bar.",
  "Đầu ngày, hít một hơi cà phê thơm — rồi cả ca làm sẽ trôi như crema êm.",
  "Khách quen nhớ tên bạn, nhớ ly espresso quen — đó là phép màu của quán nhỏ.",
];

function todayDateOnly(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Lazy-initialize today's quote. Reads from DB if cached; otherwise calls
 * the quote service and caches. Never throws — falls back to a static line on error.
 */
export async function getOrCreateTodayQuote(): Promise<{
  content: string;
  model: string;
  cached: boolean;
}> {
  const today = todayDateOnly();
  try {
    const existing = await prisma.dailyQuote.findUnique({
      where: { date: today },
    });
    if (existing) {
      return { content: existing.content, model: existing.model, cached: true };
    }
  } catch {
    // DB unreachable — fall through to static fallback
    return {
      content: FALLBACK_QUOTES[today.getDate() % FALLBACK_QUOTES.length],
      model: "fallback",
      cached: false,
    };
  }

  // Try to generate via remote service; on failure use a deterministic fallback so
  // we don't pound the API for every page load.
  try {
    const { content, model } = await generateDailyQuote();
    const saved = await prisma.dailyQuote.create({
      data: { date: today, content, model },
    });
    return { content: saved.content, model: saved.model, cached: false };
  } catch {
    const fallback =
      FALLBACK_QUOTES[today.getDate() % FALLBACK_QUOTES.length];
    try {
      await prisma.dailyQuote.create({
        data: { date: today, content: fallback, model: "fallback" },
      });
    } catch {
      // unique constraint race — ignore
    }
    return { content: fallback, model: "fallback", cached: false };
  }
}

/**
 * Force a fresh quote — used by admin "regenerate" button.
 * Replaces today's row.
 */
export async function regenerateTodayQuote(): Promise<{
  content: string;
  model: string;
}> {
  const today = todayDateOnly();
  const { content, model } = await generateDailyQuote();
  await prisma.dailyQuote.upsert({
    where: { date: today },
    update: { content, model, createdAt: new Date() },
    create: { date: today, content, model },
  });
  return { content, model };
}
