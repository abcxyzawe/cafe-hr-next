"use server";

import { revalidatePath } from "next/cache";
import { generateDrinkOfTheDay, generateDrinkImage } from "@/lib/xai";
import {
  dayKeyFor,
  setCachedDrink,
} from "@/lib/drink-of-the-day";

export async function refreshDrinkAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const today = new Date();
    const seed = dayKeyFor(today);
    const drink = await generateDrinkOfTheDay(seed);
    const image = await generateDrinkImage(drink.imagePromptBasis);
    setCachedDrink(today, {
      name: drink.name,
      tagline: drink.tagline,
      imageUrl: image.url,
      generatedAt: new Date().toISOString(),
    });
    revalidatePath("/display");
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Không thể tạo đồ uống mới";
    return { ok: false, error: message };
  }
}
