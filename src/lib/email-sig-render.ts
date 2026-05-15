import { THEME_COLOR, type SigData } from "./email-sig-state";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(input: string): string {
  return escapeHtml(input);
}

function isLikelyUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function buildHref(kind: "tel" | "mailto" | "url" | "ig", raw: string): string {
  if (kind === "tel") return `tel:${raw.replace(/\s+/g, "")}`;
  if (kind === "mailto") return `mailto:${raw}`;
  if (kind === "ig") {
    const handle = raw.replace(/^@+/, "").trim();
    return `https://instagram.com/${handle}`;
  }
  // url
  if (isLikelyUrl(raw)) return raw;
  return `https://${raw}`;
}

type Row = { label: string; value: string; href: string };

export function renderSignatureHtml(data: SigData): string {
  const colors = THEME_COLOR[data.theme] ?? THEME_COLOR.cafe;
  const primary = colors.primary;
  const muted = colors.muted;

  const rows: Row[] = [];
  if (data.phone.trim()) {
    rows.push({
      label: "ĐT",
      value: data.phone.trim(),
      href: buildHref("tel", data.phone.trim()),
    });
  }
  if (data.email.trim()) {
    rows.push({
      label: "Email",
      value: data.email.trim(),
      href: buildHref("mailto", data.email.trim()),
    });
  }
  if (data.instagram.trim()) {
    rows.push({
      label: "IG",
      value: data.instagram.trim(),
      href: buildHref("ig", data.instagram.trim()),
    });
  }
  if (data.website.trim()) {
    rows.push({
      label: "Web",
      value: data.website.trim(),
      href: buildHref("url", data.website.trim()),
    });
  }

  const fontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const rowsHtml = rows
    .map((r) => {
      return (
        `<tr>` +
        `<td style="padding:2px 8px 2px 0;font:12px/1.5 ${fontStack};color:${muted};white-space:nowrap;vertical-align:top;">` +
        `${escapeHtml(r.label)}</td>` +
        `<td style="padding:2px 0;font:13px/1.5 ${fontStack};color:#222222;vertical-align:top;">` +
        `<a href="${escapeAttr(r.href)}" style="color:${primary};text-decoration:none;">${escapeHtml(
          r.value,
        )}</a>` +
        `</td>` +
        `</tr>`
      );
    })
    .join("");

  const logoCell =
    data.logoUrl.trim().length > 0
      ? `<td valign="top" style="padding:0 16px 0 0;width:72px;">` +
        `<img src="${escapeAttr(
          data.logoUrl.trim(),
        )}" alt="logo" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:8px;object-fit:cover;border:0;" /></td>`
      : "";

  const nameHtml = data.name.trim()
    ? `<div style="font:bold 18px/1.2 ${fontStack};color:${primary};margin:0 0 2px 0;">${escapeHtml(
        data.name.trim(),
      )}</div>`
    : "";

  const roleHtml = data.role.trim()
    ? `<div style="font:13px/1.4 ${fontStack};color:${muted};margin:0 0 6px 0;">${escapeHtml(
        data.role.trim(),
      )}</div>`
    : "";

  const dividerHtml =
    `<div style="height:1px;background:${primary};opacity:0.25;margin:6px 0 8px 0;line-height:1px;font-size:0;">&nbsp;</div>`;

  return (
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" ` +
    `style="border-collapse:collapse;max-width:480px;background:#ffffff;font-family:${fontStack};">` +
    `<tr>` +
    logoCell +
    `<td valign="top" style="vertical-align:top;">` +
    nameHtml +
    roleHtml +
    dividerHtml +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">` +
    rowsHtml +
    `</table>` +
    `</td>` +
    `</tr>` +
    `</table>`
  );
}
