import "server-only";

type CalEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Format Date as iCalendar UTC datetime: YYYYMMDDTHHMMSSZ.
 */
function fmtUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

/**
 * Escape iCal TEXT field per RFC 5545: backslashes, semicolons, commas, newlines.
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Fold long lines per RFC 5545 (max 75 octets per line, continuation lines
 * begin with a single space).
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      out.push(line.slice(0, 75));
      i = 75;
    } else {
      out.push(" " + line.slice(i, i + 74));
      i += 74;
    }
  }
  return out.join("\r\n");
}

export function buildIcs(opts: {
  calendarName: string;
  events: CalEvent[];
}): string {
  const now = fmtUtc(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cafe HR//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escapeText(opts.calendarName)}`),
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
  ];

  for (const ev of opts.events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${fmtUtc(ev.start)}`);
    lines.push(`DTEND:${fmtUtc(ev.end)}`);
    lines.push(fold(`SUMMARY:${escapeText(ev.summary)}`));
    if (ev.description) {
      lines.push(fold(`DESCRIPTION:${escapeText(ev.description)}`));
    }
    if (ev.location) {
      lines.push(fold(`LOCATION:${escapeText(ev.location)}`));
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/**
 * Combine YYYY-MM-DD date with HH:MM time string into a Date object
 * interpreted in Asia/Ho_Chi_Minh timezone (UTC+7).
 */
export function combineDateTime(
  date: Date,
  hhmm: string | null,
  defaultHHMM: string,
): Date {
  const [hh, mm] = (hhmm || defaultHHMM).split(":").map(Number);
  // Assume the date is local Vietnam time (UTC+7). Subtract 7h to get UTC.
  const local = new Date(date);
  local.setHours(hh, mm, 0, 0);
  return new Date(local.getTime() - 7 * 60 * 60 * 1000);
}
