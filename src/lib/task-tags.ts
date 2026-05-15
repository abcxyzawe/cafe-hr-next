// Task tags helpers
// Storage strategy: Task model has no flexible JSON column, so we encode tags
// as a magic suffix appended to the `description` text field:
//
//   <user description>\n[tags: foo, bar, baz]
//
// The marker is stripped before display and always lives at the very end of
// the field. This avoids a schema migration while keeping tag editing simple.

const TAG_LINE_RE = /\n?\[tags:\s*([^\]]*)\]\s*$/i;

const MAX_TAGS = 10;
const MAX_TAG_LEN = 30;

/** Parse the trailing `[tags: ...]` marker out of a description, if any. */
export function parseTags(description: string | null | undefined): string[] {
  if (!description) return [];
  const m = description.match(TAG_LINE_RE);
  if (!m) return [];
  return normalizeTags(m[1].split(","));
}

/** Strip the `[tags: ...]` marker from a description for clean display. */
export function stripTagsMarker(description: string | null | undefined): string {
  if (!description) return "";
  return description.replace(TAG_LINE_RE, "").trimEnd();
}

/**
 * Take a comma-separated raw input and normalize: trim, lowercase, remove
 * empties, dedupe, cap length and count.
 */
export function normalizeTags(input: string | string[] | null | undefined): string[] {
  if (!input) return [];
  const parts = Array.isArray(input) ? input : input.split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of parts) {
    const t = raw.trim().toLowerCase();
    if (!t) continue;
    if (t.length > MAX_TAG_LEN) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/**
 * Combine a clean description body with a list of tags into the storage
 * representation (description + trailing marker). Returns null if both empty.
 */
export function encodeDescriptionWithTags(
  body: string | null | undefined,
  tags: string[],
): string | null {
  const clean = (body ?? "").replace(TAG_LINE_RE, "").trimEnd();
  const marker = tags.length > 0 ? `[tags: ${tags.join(", ")}]` : "";
  if (!clean && !marker) return null;
  if (!marker) return clean;
  if (!clean) return marker;
  return `${clean}\n${marker}`;
}

/** Build a deduped frequency-sorted list of tags from a list of descriptions. */
export function collectTagFrequency(
  descriptions: Array<string | null | undefined>,
): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const d of descriptions) {
    for (const t of parseTags(d)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
