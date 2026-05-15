import type { NewsletterData } from "./xai";

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

function isValidHexColor(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s);
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const DEFAULT_BRAND = "#6f4e37"; // cafe brown

/**
 * Render a newsletter as table-based, email-safe HTML.
 *
 * - Max width 600px
 * - Inline styles only (no <style> blocks, no classes)
 * - All user-controlled strings are HTML-escaped before interpolation
 * - Returns a self-contained <table> root suitable for pasting into an email
 *   client or rendering inside a preview <div>.
 */
export function renderNewsletterHtml(
  data: NewsletterData,
  brandColor?: string,
): string {
  const brand =
    brandColor && isValidHexColor(brandColor) ? brandColor : DEFAULT_BRAND;

  const greeting = escapeHtml(data.greeting);
  const intro = escapeHtml(data.intro);
  const ctaParagraph = escapeHtml(data.ctaParagraph);
  const ctaButton = escapeHtml(data.ctaButton);
  const signOff = escapeHtml(data.signOff);

  const headerHtml =
    `<tr><td style="background:${brand};padding:18px 24px;` +
    `font:bold 16px/1.3 ${FONT_STACK};color:#ffffff;letter-spacing:0.3px;">` +
    `Cafe HR &middot; Bản tin tuần` +
    `</td></tr>`;

  const greetingHtml =
    `<tr><td style="padding:24px 24px 8px 24px;` +
    `font:bold 18px/1.4 ${FONT_STACK};color:#222222;">` +
    `${greeting}` +
    `</td></tr>`;

  const introHtml =
    `<tr><td style="padding:0 24px 16px 24px;` +
    `font:14px/1.65 ${FONT_STACK};color:#3a3a3a;">` +
    `${intro}` +
    `</td></tr>`;

  const highlightsHtml = data.highlights
    .map((h) => {
      const title = escapeHtml(h.title);
      const body = escapeHtml(h.body);
      return (
        `<tr><td style="padding:8px 24px 8px 24px;">` +
        `<table cellpadding="0" cellspacing="0" border="0" role="presentation" ` +
        `width="100%" style="border-collapse:collapse;background:#faf6f1;` +
        `border-left:3px solid ${brand};border-radius:6px;">` +
        `<tr>` +
        `<td valign="top" style="padding:14px 14px 14px 14px;width:18px;">` +
        `<div style="width:10px;height:10px;background:${brand};` +
        `border-radius:999px;margin-top:6px;line-height:10px;font-size:0;">&nbsp;</div>` +
        `</td>` +
        `<td valign="top" style="padding:14px 16px 14px 0;">` +
        `<div style="font:bold 15px/1.3 ${FONT_STACK};color:${brand};margin:0 0 4px 0;">` +
        `${title}` +
        `</div>` +
        `<div style="font:14px/1.6 ${FONT_STACK};color:#3a3a3a;">` +
        `${body}` +
        `</div>` +
        `</td>` +
        `</tr></table>` +
        `</td></tr>`
      );
    })
    .join("");

  const ctaHtml =
    `<tr><td style="padding:20px 24px 8px 24px;` +
    `font:14px/1.65 ${FONT_STACK};color:#3a3a3a;">` +
    `${ctaParagraph}` +
    `</td></tr>` +
    `<tr><td align="center" style="padding:8px 24px 24px 24px;">` +
    `<a href="#" style="display:inline-block;background:${brand};color:#ffffff;` +
    `text-decoration:none;font:bold 14px/1 ${FONT_STACK};` +
    `padding:12px 22px;border-radius:8px;">` +
    `${ctaButton}` +
    `</a>` +
    `</td></tr>`;

  const signOffHtml =
    `<tr><td style="padding:0 24px 24px 24px;` +
    `font:italic 13px/1.5 ${FONT_STACK};color:#6a6a6a;border-top:1px solid #ececec;` +
    `padding-top:16px;">` +
    `${signOff}` +
    `</td></tr>`;

  const footerHtml =
    `<tr><td style="background:#f3ede5;padding:12px 24px;` +
    `font:11px/1.4 ${FONT_STACK};color:#8a7a6a;text-align:center;">` +
    `Bạn nhận được email này vì là khách hàng / đối tác của Cafe HR.` +
    `</td></tr>`;

  return (
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" ` +
    `width="100%" style="border-collapse:collapse;background:#ffffff;">` +
    `<tr><td align="center" style="padding:0;">` +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" ` +
    `width="600" style="border-collapse:collapse;max-width:600px;width:100%;` +
    `background:#ffffff;border:1px solid #ececec;border-radius:8px;overflow:hidden;` +
    `font-family:${FONT_STACK};">` +
    headerHtml +
    greetingHtml +
    introHtml +
    highlightsHtml +
    ctaHtml +
    signOffHtml +
    footerHtml +
    `</table>` +
    `</td></tr>` +
    `</table>`
  );
}

/**
 * Render the newsletter as Markdown (for editing / copy-paste).
 *
 * Pure function; does not escape (Markdown is plain-text friendly).
 */
export function renderNewsletterMarkdown(data: NewsletterData): string {
  const lines: string[] = [];
  lines.push(`# ${data.greeting}`);
  lines.push("");
  lines.push(data.intro);
  lines.push("");
  data.highlights.forEach((h, i) => {
    lines.push(`## ${i + 1}. ${h.title}`);
    lines.push("");
    lines.push(h.body);
    lines.push("");
  });
  lines.push(data.ctaParagraph);
  lines.push("");
  lines.push(`**[${data.ctaButton}]**`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`_${data.signOff}_`);
  return lines.join("\n");
}
