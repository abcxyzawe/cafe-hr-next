import {
  Coffee,
  Users,
  CalendarClock,
  Wallet,
  BarChart3,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Lang = "vi" | "en";

export type AboutPillar = {
  emoji: string;
  title: string;
  description: string;
  features: string[];
  href: string;
  cta: string;
  icon: LucideIcon;
  tone: string;
};

export type AboutCopy = {
  headlinePrefix: string;
  tagline: (n: number, m: number) => string;
  ctaSitemap: string;
  ctaHelp: string;
  ctaChangelog: string;
  ctaSettings: string;
  techStyleTitle: string;
  techStyleDesc: string;
  techNotes: string[];
  pillars: AboutPillar[];
};

const PILLARS_VI: AboutPillar[] = [
  {
    emoji: "👥",
    title: "Quản lý đội ngũ",
    description: "Quản lý nhân viên, vai trò, tenure, kudos và performance.",
    features: [
      "Hồ sơ chi tiết · Avatar AI",
      "Streak · Huy hiệu · Tenure milestones",
      "So sánh radar · Báo cáo CV in",
    ],
    href: "/employees",
    cta: "Mở Nhân viên",
    icon: Users,
    tone: "from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30",
  },
  {
    emoji: "📅",
    title: "Vận hành ca làm",
    description: "Lập lịch, chấm công, đơn nghỉ, công việc, checklist hằng ngày.",
    features: [
      "Tuần / Tháng grid · Smart suggest",
      "Kiosk PIN · QR · PWA offline",
      "Cover request · Conflict detector",
    ],
    href: "/shifts",
    cta: "Mở Ca làm",
    icon: CalendarClock,
    tone: "from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
  },
  {
    emoji: "💰",
    title: "Lương & tài chính",
    description: "Tính lương theo giờ, deductions, payslip in, doanh thu.",
    features: [
      "Bảng lương kỳ · CSV / Excel / Print",
      "Khấu trừ BHXH/BHYT/BHTN",
      "What-if · So sánh kỳ · Doanh thu",
    ],
    href: "/payroll",
    cta: "Mở Bảng lương",
    icon: Wallet,
    tone: "from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30",
  },
  {
    emoji: "📊",
    title: "Phân tích & AI",
    description: "Báo cáo trực quan, AI gợi ý tăng lương / standup / weekly insights.",
    features: [
      "Recharts · Heatmap · Pareto · Radar",
      "AI briefing · Standup · Weekly insights",
      "Audit log · Notes search · Performance",
    ],
    href: "/reports",
    cta: "Mở Báo cáo",
    icon: BarChart3,
    tone: "from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30",
  },
  {
    emoji: "🛠️",
    title: "Công cụ & cá nhân hóa",
    description: "Inventory, recipe, SOP, quiz, equipment, theme tiles, density.",
    features: [
      "Recipes · SOP · Quiz · Training AI",
      "Inventory · Equipment · Skills · Goals",
      "6 palettes · Dark/light · Density",
    ],
    href: "/sitemap",
    cta: "Xem sơ đồ trang",
    icon: Sparkles,
    tone: "from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30",
  },
];

const PILLARS_EN: AboutPillar[] = [
  {
    emoji: "👥",
    title: "Team management",
    description: "Manage employees, roles, tenure, kudos, and performance.",
    features: [
      "Detailed profiles · AI avatars",
      "Streaks · Badges · Tenure milestones",
      "Radar compare · Printable CV reports",
    ],
    href: "/employees",
    cta: "Open Employees",
    icon: Users,
    tone: "from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30",
  },
  {
    emoji: "📅",
    title: "Shift operations",
    description: "Scheduling, attendance, leaves, tasks, daily checklists.",
    features: [
      "Week / Month grid · Smart suggest",
      "Kiosk PIN · QR · PWA offline",
      "Cover request · Conflict detector",
    ],
    href: "/shifts",
    cta: "Open Shifts",
    icon: CalendarClock,
    tone: "from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
  },
  {
    emoji: "💰",
    title: "Payroll & finance",
    description: "Hourly payroll, deductions, printable payslips, revenue tracker.",
    features: [
      "Period payroll · CSV / Excel / Print",
      "Vietnam BHXH / BHYT / BHTN deductions",
      "What-if tool · Period compare · Revenue",
    ],
    href: "/payroll",
    cta: "Open Payroll",
    icon: Wallet,
    tone: "from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30",
  },
  {
    emoji: "📊",
    title: "Analytics & AI",
    description: "Visual reports, AI raise suggestions, standup, weekly insights.",
    features: [
      "Recharts · Heatmap · Pareto · Radar",
      "AI briefing · Standup · Weekly insights",
      "Audit log · Notes search · Performance",
    ],
    href: "/reports",
    cta: "Open Reports",
    icon: BarChart3,
    tone: "from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30",
  },
  {
    emoji: "🛠️",
    title: "Tools & personalization",
    description: "Inventory, recipes, SOP, quizzes, equipment, theme tiles, density.",
    features: [
      "Recipes · SOPs · Quiz · Training AI",
      "Inventory · Equipment · Skills · Goals",
      "6 palettes · Dark/light · Density",
    ],
    href: "/sitemap",
    cta: "View sitemap",
    icon: Sparkles,
    tone: "from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30",
  },
];

export const ABOUT_COPY: Record<Lang, AboutCopy> = {
  vi: {
    headlinePrefix: "Cafe HR · Tổng quan",
    tagline: (n, m) =>
      `Hệ quản lý nhân sự toàn diện cho quán cà phê — ${n} trụ cột, ${m}+ tính năng nổi bật, tích hợp AI Grok cho ảnh và văn bản.`,
    ctaSitemap: "Sơ đồ trang",
    ctaHelp: "Trợ giúp & FAQ",
    ctaChangelog: "Cập nhật mới",
    ctaSettings: "Cài đặt",
    techStyleTitle: "Phong cách kỹ thuật",
    techStyleDesc:
      "Codebase TypeScript strict, không dùng any; mọi tính năng đều có file riêng và tuân theo App Router.",
    techNotes: [
      "• Server Components mặc định, client components khi cần state",
      "• Recharts cho biểu đồ (luôn isAnimationActive=false)",
      "• localStorage cho per-device prefs với cross-tab sync",
      "• xAI Grok cho image gen + chat completion",
      "• PWA + service worker cho kiosk offline",
      "• Print CSS A4 portrait/landscape cho mọi báo cáo",
    ],
    pillars: PILLARS_VI,
  },
  en: {
    headlinePrefix: "Cafe HR · Overview",
    tagline: (n, m) =>
      `End-to-end HR system for cafes — ${n} pillars, ${m}+ flagship features, powered by xAI Grok for image + text.`,
    ctaSitemap: "Sitemap",
    ctaHelp: "Help & FAQ",
    ctaChangelog: "What's new",
    ctaSettings: "Settings",
    techStyleTitle: "Engineering style",
    techStyleDesc:
      "TypeScript strict codebase, no any; every feature in its own file under the App Router.",
    techNotes: [
      "• Server Components by default; client islands only when state is needed",
      "• Recharts for charts (always isAnimationActive=false)",
      "• localStorage for per-device prefs with cross-tab sync",
      "• xAI Grok for image gen + chat completion",
      "• PWA + service worker for offline kiosk",
      "• Print CSS A4 portrait/landscape on every report",
    ],
    pillars: PILLARS_EN,
  },
};

export function resolveLang(input: string | undefined): Lang {
  return input === "en" ? "en" : "vi";
}
