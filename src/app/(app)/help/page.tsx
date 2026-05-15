import { redirect } from "next/navigation";
import Link from "next/link";
import {
  HelpCircle,
  Keyboard,
  Sparkles,
  Users,
  CalendarClock,
  ClipboardCheck,
  Wallet,
  BarChart3,
  Plane,
  ListChecks,
  Heart,
  MessageSquareHeart,
  ShieldCheck,
  Coffee,
  ArrowRight,
  Code2,
  ExternalLink,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth";
import { AskAiCard } from "./ask-ai-card";

export const dynamic = "force-dynamic";

type FAQEntry = {
  question: string;
  answer: string;
};

const FAQ_GROUPS: Array<{ title: string; items: FAQEntry[] }> = [
  {
    title: "Bắt đầu sử dụng",
    items: [
      {
        question: "Tôi mới mở quán, bắt đầu từ đâu?",
        answer:
          "1) Vào Nhân viên (g+e) thêm đội ngũ. 2) Vào Ca làm (g+s) xếp lịch tuần. 3) Hướng dẫn nhân viên check-in qua trang Của tôi (g+m) hoặc kiosk tablet. 4) Cuối tháng vào Lương để xuất bảng lương.",
      },
      {
        question: "Cách thay đổi giao diện app?",
        answer:
          "Mở user menu góc phải hoặc Cài đặt → Giao diện. Có 4 chế độ sáng/tối, 6 bảng màu, 2 mức mật độ, và 17 widget dashboard có thể bật/tắt.",
      },
      {
        question: "Có app mobile không?",
        answer:
          "App là PWA — mở trên Chrome di động → menu → 'Cài đặt ứng dụng' (banner Cài đặt cũng tự xuất hiện trên trang Kiosk). Sau đó hiện như app thường, hoạt động cả khi mất mạng (kiosk).",
      },
    ],
  },
  {
    title: "Quản lý nhân viên",
    items: [
      {
        question: "Cách import nhiều nhân viên cùng lúc?",
        answer:
          "Trang Nhân viên → 'Import CSV' (đơn giản, có template) hoặc 'Import Excel' (wizard map cột linh hoạt). Cả hai đều hỗ trợ dedup theo email.",
      },
      {
        question: "Nhân viên có hồ sơ mới có cần PIN để check-in qua kiosk?",
        answer:
          "Có. Vào trang chi tiết nhân viên → Đặt PIN. PIN được hash bcrypt, dùng tại Kiosk để chấm công nhanh.",
      },
      {
        question: "Cách tăng lương cho nhiều người cùng lúc?",
        answer:
          "Bảng nhân viên → tick chọn nhiều → click 'Tăng lương (N)' → chọn theo % hoặc cộng số tiền → preview → áp dụng.",
      },
    ],
  },
  {
    title: "Lập ca & chấm công",
    items: [
      {
        question: "Cách copy lịch tuần này sang tuần sau?",
        answer:
          "Trang Ca làm → nút 'Copy tuần sau'. Hoặc dùng Templates: lưu lịch tuần này thành template rồi áp dụng vào tuần khác.",
      },
      {
        question: "Có cảnh báo khi xếp ca trùng giờ với đơn nghỉ không?",
        answer:
          "Có — khi tạo ca mà nhân viên có đơn nghỉ đã duyệt trùng ngày, system sẽ hiện cảnh báo nhưng vẫn cho tạo (admin tự quyết định).",
      },
      {
        question: "Đổi ca giữa hai nhân viên?",
        answer:
          "Trang Ca làm → 'Đổi ca' → chọn 2 nhân viên → preview → xác nhận. Toàn bộ ca trong tuần đang xem sẽ được hoán đổi (tránh trùng tự động).",
      },
      {
        question: "Sửa giờ ca?",
        answer:
          "Click trực tiếp vào dòng giờ trên thẻ ca trong week-grid (admin). Popover mở ra cho sửa start/end inline.",
      },
    ],
  },
  {
    title: "Lương & báo cáo",
    items: [
      {
        question: "Lương được tính thế nào?",
        answer:
          "Tự động = số giờ chấm công đã đóng (checkOut khác null) × hourlyRate của nhân viên. Vào /payroll xem theo từng kỳ tháng.",
      },
      {
        question: "Phiếu lương cá nhân?",
        answer:
          "Trang chi tiết nhân viên → 'In phiếu lương'. Tự sinh A4 in được, có break-down theo tuần, chữ ký người lập + người nhận.",
      },
      {
        question: "Backup dữ liệu?",
        answer:
          "Cài đặt → Sao lưu dữ liệu → tải file XLSX có 7 sheet (NV, ca, chấm công, đơn nghỉ, lương, công việc, hoạt động). Hoặc xuất CSV riêng cho từng entity.",
      },
    ],
  },
  {
    title: "Phím tắt & năng suất",
    items: [
      {
        question: "Có phím tắt nào nhanh không?",
        answer:
          "Bấm ? ở bất kỳ đâu để xem toàn bộ phím tắt. Quan trọng nhất: Ctrl+K mở thanh lệnh, Ctrl+Shift+A tạo nhanh, g+e/s/a/l/t điều hướng kiểu vim.",
      },
      {
        question: "Sao mở màn hình TV cho phòng làm việc?",
        answer:
          "Bấm g+d (mở /display tab mới) hoặc Quick-add FAB → 'Mở màn hình TV'. Trang full-screen tự refresh 30s, hiện ai đang làm + activity ticker.",
      },
    ],
  },
];

const QUICK_LINKS: Array<{
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}> = [
  { href: "/changelog", icon: Sparkles, label: "Có gì mới?", description: "Lịch sử cập nhật" },
  { href: "/employees", icon: Users, label: "Nhân viên", description: "Quản lý đội ngũ" },
  { href: "/shifts", icon: CalendarClock, label: "Ca làm", description: "Lịch tuần / tháng" },
  { href: "/attendance", icon: ClipboardCheck, label: "Chấm công", description: "Check-in / out" },
  { href: "/payroll", icon: Wallet, label: "Lương", description: "Bảng lương theo tháng" },
  { href: "/reports", icon: BarChart3, label: "Báo cáo", description: "Charts + heatmap" },
  { href: "/leave", icon: Plane, label: "Nghỉ phép", description: "Quản lý đơn" },
  { href: "/tasks", icon: ListChecks, label: "Công việc", description: "Task + tag" },
];

function ApiDevToolsCard() {
  const openapiUrl = "/api/openapi.json";
  const postmanImportUrl = "https://www.postman.com/downloads/";
  const brunoUrl = "https://www.usebruno.com/";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="size-5 text-primary" />
          API & công cụ dev
        </CardTitle>
        <CardDescription>
          Spec OpenAPI sẵn dùng — import vào Postman, Bruno, Insomnia hoặc client tùy chọn.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline" size="sm">
            <a href={openapiUrl} target="_blank" rel="noreferrer">
              <Code2 className="size-4" />
              Mở openapi.json
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={postmanImportUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Cài Postman
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={brunoUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Bruno (open-source)
            </a>
          </Button>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          <li>• Postman: File → Import → URL → dán <code className="rounded bg-muted px-1">{openapiUrl}</code> (full URL phía bạn)</li>
          <li>• Bruno: New Collection → Import → OpenAPI v3 → trỏ tới file đã tải</li>
          <li>• Auth: cookie session (đăng nhập trước trong trình duyệt → copy cookie)</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export default async function HelpPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hỏi AI */}
      <AskAiCard />

      <ApiDevToolsCard />

      {/* Hero */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <HelpCircle className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                Trung tâm trợ giúp
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Câu hỏi thường gặp, hướng dẫn nhanh và phím tắt cho Cafe HR.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href="#faq">
                    <HelpCircle className="size-4" />
                    Xem FAQ
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href="/changelog">
                    <Sparkles className="size-4" />
                    Cập nhật mới nhất
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coffee className="size-5 text-primary" />
            Truy cập nhanh
          </CardTitle>
          <CardDescription>
            8 trang chính của hệ thống — bookmark hoặc dùng thanh lệnh (Ctrl+K) để
            đến nhanh hơn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="group flex items-start gap-2.5 rounded-lg border bg-card p-3 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{q.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {q.description}
                    </p>
                  </div>
                  <ArrowRight className="mt-2 size-3 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Keyboard tip */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="size-5 text-primary" />
            Phím tắt nhanh
          </CardTitle>
          <CardDescription>
            Bấm <Kbd>?</Kbd> ở bất kỳ trang nào để xem toàn bộ.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <Tip
            keys={["Ctrl", "K"]}
            label="Mở thanh lệnh — tìm kiếm nhân viên / điều hướng"
          />
          <Tip keys={["Ctrl", "Shift", "A"]} label="Tạo nhanh (FAB)" />
          <Tip keys={["?"]} label="Bảng phím tắt đầy đủ" />
          <Tip keys={["Esc"]} label="Đóng popover/dialog" />
          <Tip keys={["g", "e"]} label="→ Nhân viên" />
          <Tip keys={["g", "s"]} label="→ Ca làm" />
          <Tip keys={["g", "m"]} label="→ Của tôi (staff)" />
          <Tip keys={["g", "d"]} label="→ Màn hình TV (mở tab mới)" />
        </CardContent>
      </Card>

      {/* FAQ */}
      <div id="faq" className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <HelpCircle className="size-5 text-primary" />
          Câu hỏi thường gặp
        </h2>

        {FAQ_GROUPS.map((g) => (
          <Card key={g.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{g.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <ul className="divide-y">
                {g.items.map((q, i) => (
                  <details key={i} className="group py-2.5">
                    <summary className="flex cursor-pointer list-none items-start gap-2 font-medium hover:text-primary">
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary group-open:rotate-90 transition-transform">
                        ▶
                      </span>
                      <span className="flex-1">{q.question}</span>
                    </summary>
                    <div className="mt-2 pl-6 text-sm text-muted-foreground leading-relaxed">
                      {q.answer}
                    </div>
                  </details>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareHeart className="size-5 text-primary" />
            Cần hỗ trợ thêm?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Bạn có thể gửi phản hồi/báo lỗi trực tiếp qua nút{" "}
            <Badge variant="outline" className="gap-1 align-middle">
              <MessageSquareHeart className="size-3" />
              Phản hồi
            </Badge>{" "}
            ở thanh trên cùng. Phản hồi của bạn được ghi vào nhật ký hệ thống và
            admin sẽ xem được tại{" "}
            <Link
              href="/settings/feedback"
              className="font-medium text-primary hover:underline"
            >
              Cài đặt → Phản hồi người dùng
            </Link>
            .
          </p>
          <p>
            Admin: vào{" "}
            <Link href="/audit" className="font-medium text-primary hover:underline">
              Nhật ký
            </Link>{" "}
            xem toàn bộ thao tác — có filter, search highlight, expand JSON, dọn dẹp
            theo khoảng thời gian.
          </p>
          <p className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5 text-primary" />
            Bảo mật: mật khẩu hash bcrypt, JWT HS256, cookie httpOnly, CSRF qua
            same-site lax.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[24px] items-center justify-center rounded border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function Tip({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-1.5">
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
            <Kbd>{k}</Kbd>
          </span>
        ))}
      </span>
      <span className="flex-1 truncate text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
