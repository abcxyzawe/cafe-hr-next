import { createElement, type ReactElement } from "react";

/**
 * Tiny, safe Markdown renderer for short user-authored text (notes).
 *
 * XSS strategy (read before changing):
 *   1. Escape HTML special chars on the RAW input first.
 *   2. Apply Markdown-ish transformations on the already-escaped string.
 *
 * Because step 1 runs before step 2, any `<`, `>`, `&`, `"` or `'` from the
 * user is turned into entities and can never form an HTML tag or attribute.
 * The only HTML tags in the final output come from our own static templates
 * (<strong>, <em>, <p>, <br />, <a ...>), and the only attribute we inject
 * is `href` — fed exclusively from a regex that requires `https?://` and
 * forbids whitespace or `<`. The href value is the post-escape text, so
 * any quotes inside have already become `&quot;` / `&#39;` and cannot
 * break out of the attribute. This makes the use of dangerouslySetInnerHTML
 * in MarkdownText safe for this constrained input.
 */

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

export function renderMarkdownMini(text: string): { html: string } {
  // Step 1: escape FIRST — neutralises any HTML the user typed.
  let s = escapeHtml(text);

  // Step 2: bare URL auto-linking on the escaped string.
  // Trim trailing punctuation so "see https://x.com." doesn't swallow the dot.
  s = s.replace(/(https?:\/\/[^\s<]+)/g, (raw) => {
    let url = raw;
    let trail = "";
    while (url.length > 0 && /[.,;:!?)\]]/.test(url[url.length - 1]!)) {
      trail = url[url.length - 1]! + trail;
      url = url.slice(0, -1);
    }
    if (url.length === 0) return raw;
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${url}</a>${trail}`;
  });

  // Step 3: bold **...** (no newlines inside).
  s = s.replace(/\*\*([^\s*][^*\n]*?[^\s*]|\S)\*\*/g, "<strong>$1</strong>");

  // Step 4: italic *...* — boundaries required so we don't catch * mid-word.
  s = s.replace(
    /(^|[\s(])\*([^\s*][^*\n]*?[^\s*]|\S)\*(?=$|[\s.,;:!?)])/g,
    "$1<em>$2</em>",
  );

  // Step 4b: @mentions written as `@[Tên](id)` markers.
  // Safe because:
  //   - the surrounding `[`, `]`, `(`, `)` survive escapeHtml() (they aren't
  //     in the escape map), so this regex still matches after step 1.
  //   - the captured name was already escaped in step 1 — any `<`, `&`, `"`,
  //     `'` inside it is an entity, so it cannot break out of the link text.
  //   - the id is constrained to `\d+` so it cannot break out of the href.
  s = s.replace(/@\[([^\]\n]{1,50})\]\((\d+)\)/g, (_m, name: string, id: string) => {
    return `<a href="/employees/${id}" class="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1 py-0.5 text-primary font-medium hover:bg-primary/15 no-underline">@${name}</a>`;
  });

  // Step 5: paragraphs (blank line) and soft breaks (single \n).
  s = s.replace(/\r\n?/g, "\n");
  const paragraphs = s
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, "<br />"))
    .filter((p) => p.length > 0);

  const html =
    paragraphs.length === 0
      ? "<p></p>"
      : paragraphs.map((p) => `<p>${p}</p>`).join("");

  return { html };
}

export function MarkdownText({
  text,
  className,
}: {
  text: string;
  className?: string;
}): ReactElement {
  const { html } = renderMarkdownMini(text);
  const base =
    "text-sm text-foreground [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_em]:italic [&_a]:break-words";
  // Safe: `html` is built from escapeHtml() output plus a fixed set of our own
  // tags. See the file header for the full XSS argument.
  return createElement("div", {
    className: className ? `${base} ${className}` : base,
    dangerouslySetInnerHTML: { __html: html },
  });
}
