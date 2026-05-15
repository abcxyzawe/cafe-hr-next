import { readdir } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { Check, Download, Palette as PaletteIcon, Sparkles, X } from "lucide-react";
import { getSession } from "@/lib/auth";
import { PALETTES, type Palette } from "@/lib/palette";
import { hslFragmentToHex } from "@/lib/hsl-to-hex";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CopyFilename } from "./copy-filename";

export const dynamic = "force-dynamic";

const FALLBACK_LOGOS = ["logo-96.png"] as const;
const IMAGE_EXTENSIONS = new Set([".png", ".svg", ".jpg", ".jpeg", ".webp"]);

async function listBrandAssets(): Promise<string[]> {
  try {
    const dir = path.join(process.cwd(), "public", "brand");
    const entries = await readdir(dir);
    const filtered = entries
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));
    return filtered.length > 0 ? filtered : [...FALLBACK_LOGOS];
  } catch {
    return [...FALLBACK_LOGOS];
  }
}

type SwatchKey = "primary" | "primaryFg" | "accent" | "ring" | "chart1";
const SWATCH_LABELS: Record<SwatchKey, string> = {
  primary: "primary",
  primaryFg: "primary-fg",
  accent: "accent",
  ring: "ring",
  chart1: "chart-1",
};
const SWATCH_KEYS: SwatchKey[] = [
  "primary",
  "primaryFg",
  "accent",
  "ring",
  "chart1",
];

function Swatch({ label, fragment }: { label: string; fragment: string }) {
  const hex = hslFragmentToHex(fragment);
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-12 w-full rounded-md border shadow-inner"
        style={{ backgroundColor: `hsl(${fragment})` }}
        aria-label={`${label}: ${hex}`}
      />
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-[10px] leading-tight text-foreground/80">
        {fragment}
      </div>
      <div className="font-mono text-[10px] leading-tight text-muted-foreground">
        {hex}
      </div>
    </div>
  );
}

function ModeSwatchGrid({
  mode,
  tokens,
}: {
  mode: "Light" | "Dark";
  tokens: Palette["light"];
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">
        {mode}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {SWATCH_KEYS.map((k) => (
          <Swatch key={k} label={SWATCH_LABELS[k]} fragment={tokens[k]} />
        ))}
      </div>
    </div>
  );
}

function PaletteBlock({ palette }: { palette: Palette }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{palette.name}</div>
          <div className="text-xs text-muted-foreground">{palette.hint}</div>
        </div>
        <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
          {palette.id}
        </code>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ModeSwatchGrid mode="Light" tokens={palette.light} />
        <ModeSwatchGrid mode="Dark" tokens={palette.dark} />
      </div>
    </div>
  );
}

function GuidelineItem({
  type,
  text,
}: {
  type: "do" | "dont";
  text: string;
}) {
  const isDo = type === "do";
  return (
    <li className="flex items-start gap-2">
      <span
        className={
          isDo
            ? "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
            : "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
        }
      >
        {isDo ? <Check className="size-3" /> : <X className="size-3" />}
      </span>
      <span className="text-sm leading-relaxed">{text}</span>
    </li>
  );
}

export default async function BrandPage() {
  const sess = await getSession();
  if (sess?.role !== "admin") redirect("/");

  const assets = await listBrandAssets();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                Brand kit & nguyên tắc giao diện
              </CardTitle>
              <CardDescription>
                Tham chiếu nhanh logo, bảng màu, typography và component cho
                Cafe HR. Trang này chỉ dành cho admin.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaletteIcon className="size-5" /> Logo
          </CardTitle>
          <CardDescription>
            Các phiên bản logo đặt tại <code className="font-mono">/public/brand/</code>.
            Bấm vào tên file để sao chép.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {assets.map((file) => {
              const href = `/brand/${file}`;
              return (
                <div
                  key={file}
                  className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4"
                >
                  <div className="flex h-24 w-24 items-center justify-center rounded-md bg-background p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={href}
                      alt={file}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <CopyFilename value={file} className="max-w-full" />
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <a href={href} download>
                      <Download className="size-3" /> Tải xuống
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảng màu</CardTitle>
          <CardDescription>
            6 palettes có sẵn — mỗi palette gồm 5 token chính cho cả light &
            dark mode. Giá trị HSL được áp vào CSS variable, HEX là quy đổi
            tham khảo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PALETTES.map((p) => (
            <PaletteBlock key={p.id} palette={p} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>
            Hệ thống type-scale dùng class Tailwind tương ứng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { tag: "H1", className: "text-4xl font-bold tracking-tight", size: "36px / 2.25rem" },
            { tag: "H2", className: "text-3xl font-semibold tracking-tight", size: "30px / 1.875rem" },
            { tag: "H3", className: "text-2xl font-semibold", size: "24px / 1.5rem" },
            { tag: "H4", className: "text-xl font-semibold", size: "20px / 1.25rem" },
            { tag: "Body", className: "text-base", size: "16px / 1rem" },
            { tag: "Small", className: "text-sm text-muted-foreground", size: "14px / 0.875rem" },
          ].map((row) => (
            <div
              key={row.tag}
              className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 md:flex-row md:items-baseline md:justify-between md:gap-6"
            >
              <div className={row.className}>
                {row.tag} — Cà phê thơm, nhân viên vui.
              </div>
              <div className="flex shrink-0 gap-3 font-mono text-xs text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5">{row.tag}</span>
                <span>{row.size}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Components</CardTitle>
          <CardDescription>
            Các khối UI cơ bản. Sử dụng đúng variant để giữ nhất quán toàn app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-2 text-sm font-semibold">Buttons</div>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </div>
          <Separator />
          <div>
            <div className="mb-2 text-sm font-semibold">Badges</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
            </div>
          </div>
          <Separator />
          <div>
            <div className="mb-2 text-sm font-semibold">Card</div>
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Ca sáng — Quầy pha chế</CardTitle>
                <CardDescription>06:00 → 14:00 · 3 nhân viên</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant="success">Đã đủ người</Badge>
                <Button size="sm" variant="outline">
                  Xem chi tiết
                </Button>
              </CardContent>
            </Card>
          </div>
          <Separator />
          <div>
            <div className="mb-2 text-sm font-semibold">Avatars</div>
            <div className="flex items-end gap-4">
              {[32, 48, 72].map((size) => (
                <div key={size} className="flex flex-col items-center gap-1">
                  <Avatar size={size} fallback="An Đỗ" role="barista" />
                  <span className="font-mono text-xs text-muted-foreground">
                    {size}px
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nguyên tắc</CardTitle>
          <CardDescription>
            Một vài quy ước giúp giao diện sạch và nhất quán.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <GuidelineItem
              type="do"
              text="Nên dùng tone Cà phê làm mặc định — chỉ đổi palette khi user chủ động chọn trong Settings."
            />
            <GuidelineItem
              type="do"
              text="Nên dùng Badge variant 'success' / 'warning' đúng ngữ nghĩa trạng thái (xanh = ổn, vàng = cần chú ý)."
            />
            <GuidelineItem
              type="do"
              text="Nên giữ Button 'default' cho hành động chính trong mỗi khu vực; phụ trợ dùng 'outline' hoặc 'ghost'."
            />
            <GuidelineItem
              type="dont"
              text="Tránh dùng quá 3 badge cùng màu trong một bảng — sẽ làm mất trọng tâm thị giác."
            />
            <GuidelineItem
              type="dont"
              text="Tránh hard-code hex màu trong component; luôn dùng CSS variable (bg-primary, text-muted-foreground...)."
            />
            <GuidelineItem
              type="dont"
              text="Tránh đặt nhiều Button 'destructive' liền kề nhau — luôn yêu cầu xác nhận trước khi xóa."
            />
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
