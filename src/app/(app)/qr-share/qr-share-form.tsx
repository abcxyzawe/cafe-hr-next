"use client";

import * as React from "react";
import {
  Copy,
  Check,
  Download,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Type as TypeIcon,
  Wifi,
  Sparkles,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  QR_RECENTS_EVENT,
  STORAGE_KEY,
  clearRecents,
  getRecents,
  pushRecent,
  type QrMode,
  type QrRecent,
} from "@/lib/qr-recents-state";

type WifiSecurity = "WPA" | "WEP" | "nopass";

const MODE_TABS: ReadonlyArray<{
  id: QrMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "url", label: "URL", icon: LinkIcon },
  { id: "text", label: "Văn bản", icon: TypeIcon },
  { id: "wifi", label: "WiFi", icon: Wifi },
];

const URL_PATTERN = /^https?:\/\/.+/i;

function escapeWifiField(value: string): string {
  // Escape backslash, semicolon, comma, colon, and double quote per WiFi QR spec
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function buildWifiPayload(
  ssid: string,
  password: string,
  security: WifiSecurity,
): string {
  const sec = security === "nopass" ? "nopass" : security;
  const escSsid = escapeWifiField(ssid);
  const escPass = security === "nopass" ? "" : escapeWifiField(password);
  return `WIFI:T:${sec};S:${escSsid};P:${escPass};;`;
}

function qrImageUrl(payload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payload)}`;
}

function modeLabel(mode: QrMode): string {
  switch (mode) {
    case "url":
      return "URL";
    case "text":
      return "Văn bản";
    case "wifi":
      return "WiFi";
  }
}

function buildLabel(
  mode: QrMode,
  payload: string,
  ssid?: string,
): string {
  if (mode === "wifi") {
    return ssid ? `WiFi: ${ssid}` : "WiFi";
  }
  if (mode === "url") {
    return payload.length > 60 ? `${payload.slice(0, 57)}...` : payload;
  }
  const single = payload.replace(/\s+/g, " ").trim();
  return single.length > 60 ? `${single.slice(0, 57)}...` : single;
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function QrShareForm(): React.ReactElement {
  const [mode, setMode] = React.useState<QrMode>("url");
  const [urlValue, setUrlValue] = React.useState<string>("");
  const [textValue, setTextValue] = React.useState<string>("");
  const [ssid, setSsid] = React.useState<string>("");
  const [password, setPassword] = React.useState<string>("");
  const [security, setSecurity] = React.useState<WifiSecurity>("WPA");
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [generated, setGenerated] = React.useState<{
    mode: QrMode;
    payload: string;
    label: string;
  } | null>(null);
  const [copied, setCopied] = React.useState<boolean>(false);
  const [recents, setRecents] = React.useState<QrRecent[]>([]);
  const [hydrated, setHydrated] = React.useState<boolean>(false);

  React.useEffect(() => {
    setHydrated(true);
    setRecents(getRecents());
    function handleChange(): void {
      setRecents(getRecents());
    }
    function handleStorage(e: StorageEvent): void {
      if (e.key === STORAGE_KEY) {
        setRecents(getRecents());
      }
    }
    window.addEventListener(QR_RECENTS_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(QR_RECENTS_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  React.useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  function handleGenerate(): void {
    setError(null);
    if (mode === "url") {
      const trimmed = urlValue.trim();
      if (!trimmed) {
        setError("Vui lòng nhập URL.");
        return;
      }
      if (!URL_PATTERN.test(trimmed)) {
        setError("URL phải bắt đầu bằng http:// hoặc https://");
        return;
      }
      const label = buildLabel("url", trimmed);
      setGenerated({ mode: "url", payload: trimmed, label });
      pushRecent({ mode: "url", label, payload: trimmed });
      return;
    }
    if (mode === "text") {
      const trimmed = textValue.trim();
      if (!trimmed) {
        setError("Vui lòng nhập nội dung văn bản.");
        return;
      }
      const label = buildLabel("text", trimmed);
      setGenerated({ mode: "text", payload: trimmed, label });
      pushRecent({ mode: "text", label, payload: trimmed });
      return;
    }
    // wifi
    const trimmedSsid = ssid.trim();
    if (!trimmedSsid) {
      setError("Vui lòng nhập tên WiFi (SSID).");
      return;
    }
    if (security !== "nopass" && password.length === 0) {
      setError("Vui lòng nhập mật khẩu WiFi.");
      return;
    }
    const payload = buildWifiPayload(trimmedSsid, password, security);
    const label = buildLabel("wifi", payload, trimmedSsid);
    setGenerated({ mode: "wifi", payload, label });
    pushRecent({ mode: "wifi", label, payload });
  }

  async function handleCopyPayload(): Promise<void> {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.payload);
      setCopied(true);
    } catch {
      setError("Không thể sao chép vào clipboard.");
    }
  }

  function handleClearRecents(): void {
    clearRecents();
  }

  function handleReloadRecent(item: QrRecent): void {
    setError(null);
    setMode(item.mode);
    setGenerated({
      mode: item.mode,
      payload: item.payload,
      label: item.label,
    });
    if (item.mode === "url") {
      setUrlValue(item.payload);
    } else if (item.mode === "text") {
      setTextValue(item.payload);
    }
  }

  const downloadHref = generated ? qrImageUrl(generated.payload) : "";
  const downloadFilename = generated
    ? `qr-${generated.mode}-${Date.now()}.png`
    : "qr.png";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Mode tabs */}
        <div
          role="tablist"
          aria-label="Chọn loại QR"
          className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-1"
        >
          {MODE_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => {
                  setMode(tab.id);
                  setError(null);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <div className="space-y-4">
          {mode === "url" ? (
            <div className="space-y-2">
              <Label htmlFor="qr-url">URL</Label>
              <Input
                id="qr-url"
                type="url"
                inputMode="url"
                placeholder="https://example.com"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Phải bắt đầu bằng http:// hoặc https://
              </p>
            </div>
          ) : null}

          {mode === "text" ? (
            <div className="space-y-2">
              <Label htmlFor="qr-text">Nội dung</Label>
              <textarea
                id="qr-text"
                rows={5}
                placeholder="Nhập văn bản tự do..."
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Tối đa khoảng vài trăm ký tự để QR còn dễ quét.
              </p>
            </div>
          ) : null}

          {mode === "wifi" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="qr-ssid">Tên WiFi (SSID)</Label>
                <Input
                  id="qr-ssid"
                  placeholder="Cafe-HR-Guest"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-wifi-pass">Mật khẩu</Label>
                <div className="relative">
                  <Input
                    id="qr-wifi-pass"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={security === "nopass"}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
                    disabled={security === "nopass"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qr-wifi-sec">Bảo mật</Label>
                <Select
                  id="qr-wifi-sec"
                  value={security}
                  onChange={(e) =>
                    setSecurity(e.target.value as WifiSecurity)
                  }
                >
                  <option value="WPA">WPA / WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">Không mật khẩu</option>
                </Select>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div>
            <Button type="button" onClick={handleGenerate}>
              <Sparkles className="size-4" />
              Tạo QR
            </Button>
          </div>
        </div>

        {/* Result */}
        {generated ? (
          <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="rounded-xl border bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrImageUrl(generated.payload)}
                  alt={`QR cho ${generated.label}`}
                  width={300}
                  height={300}
                  className="block h-[300px] w-[300px]"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Loại
                  </p>
                  <p className="text-sm font-medium">
                    {modeLabel(generated.mode)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Nội dung
                  </p>
                  <pre className="mt-1 max-h-32 overflow-auto rounded-md border bg-background p-2 font-mono text-xs">
                    {generated.payload}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                  >
                    <a
                      href={downloadHref}
                      download={downloadFilename}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="size-4" />
                      Tải ảnh
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPayload}
                  >
                    {copied ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copied ? "Đã sao chép" : "Sao chép nội dung"}
                  </Button>
                </div>
                <p className="text-xs italic text-muted-foreground">
                  Mẹo: Bấm chuột phải lên ảnh QR rồi chọn &quot;Lưu ảnh&quot;
                  nếu nút Tải không hoạt động.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Recents */}
      <aside className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Gần đây</h3>
          {hydrated && recents.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearRecents}
            >
              <Trash2 className="size-4" />
              Xoá tất cả
            </Button>
          ) : null}
        </div>
        {!hydrated ? (
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Đang tải...
          </div>
        ) : recents.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
            Chưa có QR nào được tạo.
          </div>
        ) : (
          <ul className="space-y-2">
            {recents.map((item) => (
              <li
                key={item.id}
                className="rounded-md border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {modeLabel(item.mode)} ·{" "}
                      {formatDateTime(item.createdAt)}
                    </p>
                    <p className="truncate text-sm font-medium">
                      {item.label}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleReloadRecent(item)}
                    aria-label="Tạo lại QR"
                    title="Tạo lại"
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
