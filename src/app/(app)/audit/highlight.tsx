import * as React from "react";

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splits `text` on case-insensitive matches of `query` and returns a React
 * fragment where matched substrings are wrapped in `<mark>`. Output uses
 * plain React text nodes only, so escaping is handled automatically.
 */
export function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const trimmed = query.trim();
  if (!trimmed) return text;

  const re = new RegExp(`(${escapeRegex(trimmed)})`, "gi");
  const parts = text.split(re);
  if (parts.length <= 1) return text;

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="bg-amber-200 dark:bg-amber-500/30 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
