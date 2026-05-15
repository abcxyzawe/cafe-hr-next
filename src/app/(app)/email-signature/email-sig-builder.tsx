"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Copy, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  DEFAULT_SIG_DATA,
  SIG_EVENT,
  STORAGE_KEY,
  THEME_COLOR,
  THEME_LABEL,
  getSigData,
  setSigData,
  type SigData,
  type SigTheme,
} from "@/lib/email-sig-state";
import { renderSignatureHtml } from "@/lib/email-sig-render";

const THEME_OPTIONS: SigTheme[] = ["cafe", "ocean", "rose", "forest", "mono"];

type FieldKey = Exclude<keyof SigData, "theme">;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  placeholder: string;
  type?: string;
}> = [
  { key: "name", label: "Họ tên", placeholder: "VD: Đỗ Quốc Anh" },
  { key: "role", label: "Vai trò / Chức danh", placeholder: "VD: Quản lý ca" },
  { key: "phone", label: "Điện thoại", placeholder: "0901 234 567", type: "tel" },
  { key: "email", label: "Email", placeholder: "name@cafe.vn", type: "email" },
  { key: "instagram", label: "Instagram", placeholder: "@cafe.hr" },
  { key: "website", label: "Website", placeholder: "https://cafehr.vn", type: "url" },
  { key: "logoUrl", label: "Logo URL (tùy chọn)", placeholder: "https://...", type: "url" },
];

export function EmailSigBuilder() {
  const [data, setData] = useState<SigData>(() => ({ ...DEFAULT_SIG_DATA }));
  const [hydrated, setHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    setData(getSigData());
    setHydrated(true);
  }, []);

  // Sync across tabs / same-tab events
  useEffect(() => {
    if (!hydrated) return;
    const reread = () => setData(getSigData());
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) reread();
    };
    const onCustom = () => reread();
    window.addEventListener("storage", onStorage);
    window.addEventListener(SIG_EVENT, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SIG_EVENT, onCustom);
    };
  }, [hydrated]);

  // All user input is escaped inside renderSignatureHtml (escapeHtml/escapeAttr),
  // so the resulting HTML string is safe to inject into the preview.
  const html = useMemo(() => renderSignatureHtml(data), [data]);

  const updateField = useCallback((key: FieldKey, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateTheme = useCallback(
    (theme: SigTheme) => {
      setData((prev) => ({ ...prev, theme }));
      // Persist theme immediately for snappier feedback
      setSigData({ ...data, theme });
    },
    [data],
  );

  const handleSave = useCallback(() => {
    setSigData(data);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }, [data]);

  const handleBlurSave = useCallback(() => {
    setSigData(data);
  }, [data]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: use a hidden textarea
      try {
        const ta = document.createElement("textarea");
        ta.value = html;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        // ignore
      }
    }
  }, [html]);

  const themeColor = THEME_COLOR[data.theme];
  // Pulled into a variable so the safety boundary is explicit at the call site.
  const safeHtml = { __html: html };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {/* LEFT: Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Thông tin chữ ký</CardTitle>
          <CardDescription>
            Bản nháp tự lưu khi rời ô nhập. Có thể bấm &quot;Lưu&quot; để xác
            nhận thủ công.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={`sig-${f.key}`}>{f.label}</Label>
              <Input
                id={`sig-${f.key}`}
                type={f.type ?? "text"}
                value={data[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => updateField(f.key, e.target.value)}
                onBlur={handleBlurSave}
                autoComplete="off"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <Label htmlFor="sig-theme">Tone màu</Label>
            <div className="flex items-center gap-3">
              <Select
                id="sig-theme"
                value={data.theme}
                onChange={(e) => updateTheme(e.target.value as SigTheme)}
                className="flex-1"
              >
                {THEME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {THEME_LABEL[t]}
                  </option>
                ))}
              </Select>
              <span
                aria-label={`Màu chính ${themeColor.primary}`}
                className="size-9 shrink-0 rounded-md border shadow-inner"
                style={{ backgroundColor: themeColor.primary }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="button" onClick={handleSave}>
              {saved ? (
                <Check className="size-4" />
              ) : (
                <Save className="size-4" />
              )}
              {saved ? "Đã lưu" : "Lưu bản nháp"}
            </Button>
            <Button type="button" variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Đã sao chép" : "Sao chép HTML"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RIGHT: Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Xem trước</CardTitle>
          <CardDescription>
            Render bằng inline-style an toàn cho email — hầu hết Gmail / Outlook
            sẽ giữ nguyên định dạng khi dán.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            {hydrated ? (
              // Safe: html produced by renderSignatureHtml which HTML-escapes
              // every user-controlled string before interpolation.
              // eslint-disable-next-line react/no-danger
              <div dangerouslySetInnerHTML={safeHtml} />
            ) : (
              <div className="text-xs text-muted-foreground">
                Đang tải bản nháp…
              </div>
            )}
          </div>

          <details className="rounded-md border bg-muted/30 p-3 text-xs">
            <summary className="cursor-pointer font-medium">
              Xem HTML thô
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground/80">
              {html}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
