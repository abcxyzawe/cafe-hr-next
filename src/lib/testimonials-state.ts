export const STORAGE_KEY = "cafe-hr-testimonials";
export const TESTIMONIALS_EVENT = "cafe-hr:testimonials-changed";

export type Rating = 1 | 2 | 3 | 4 | 5;

export type Testimonial = {
  id: string;
  name: string;
  rating: Rating;
  quote: string;
  photoUrl: string;
  date: string; // ISO YYYY-MM-DD
  featured: boolean;
  createdAt: string;
};

export type AddTestimonialInput = Omit<
  Testimonial,
  "id" | "createdAt" | "featured"
> & { featured?: boolean };

function safeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRating(v: unknown): v is Rating {
  return v === 1 || v === 2 || v === 3 || v === 4 || v === 5;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}

function parseTestimonial(v: unknown): Testimonial | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const id = asString(o.id);
  const name = asString(o.name);
  const quote = asString(o.quote);
  if (!id || !name || !quote) return null;
  const rating: Rating = isRating(o.rating) ? o.rating : 5;
  return {
    id,
    name,
    rating,
    quote,
    photoUrl: asString(o.photoUrl),
    date: asString(o.date),
    featured: asBool(o.featured),
    createdAt: asString(o.createdAt) || new Date().toISOString(),
  };
}

export function getTestimonials(): Testimonial[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out: Testimonial[] = [];
    for (const item of parsed) {
      const t = parseTestimonial(item);
      if (t) out.push(t);
    }
    return out;
  } catch {
    return [];
  }
}

function persist(list: Testimonial[]): void {
  const storage = safeStorage();
  if (!storage) return;
  const value = JSON.stringify(list);
  try {
    storage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
  dispatchChange(value);
}

function dispatchChange(newValue: string | null): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        newValue,
        storageArea: window.localStorage,
      }),
    );
  } catch {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent(TESTIMONIALS_EVENT));
  } catch {
    // ignore
  }
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function addTestimonial(input: AddTestimonialInput): Testimonial {
  const created: Testimonial = {
    id: newId(),
    name: input.name.trim(),
    rating: input.rating,
    quote: input.quote.trim(),
    photoUrl: input.photoUrl.trim(),
    date: input.date,
    featured: input.featured ?? false,
    createdAt: new Date().toISOString(),
  };
  const list = getTestimonials();
  list.push(created);
  persist(list);
  return created;
}

export function updateTestimonial(id: string, patch: Partial<Testimonial>): void {
  const list = getTestimonials();
  let changed = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      const next: Testimonial = { ...list[i], ...patch, id: list[i].id };
      // Re-validate rating
      if (!isRating(next.rating)) next.rating = list[i].rating;
      list[i] = next;
      changed = true;
      break;
    }
  }
  if (changed) persist(list);
}

export function removeTestimonial(id: string): void {
  const list = getTestimonials();
  const next = list.filter((t) => t.id !== id);
  if (next.length !== list.length) persist(next);
}

export function toggleFeatured(id: string): void {
  const list = getTestimonials();
  let changed = false;
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i] = { ...list[i], featured: !list[i].featured };
      changed = true;
      break;
    }
  }
  if (changed) persist(list);
}
