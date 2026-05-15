"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Users,
  CalendarClock,
  ClipboardCheck,
  Keyboard,
  Map as MapIcon,
  Sunrise,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cafe-hr-onboarding-tour-seen";
const STORAGE_VALUE = "v2";

type Step = {
  icon: LucideIcon;
  title: string;
  description: string;
  tone: string;
};

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Chào mừng",
    description:
      "Chào mừng đến với Cafe HR! Đây là bảng điều khiển tổng quan. Bạn sẽ thấy KPI, lịch ca hôm nay, hoạt động và nhiều hơn nữa.",
    tone: "from-amber-500 to-orange-500",
  },
  {
    icon: Users,
    title: "Quản lý nhân viên",
    description:
      "Vào trang Nhân viên (g+e) để thêm nhân viên đầu tiên. Mỗi nhân viên có ảnh, vai trò, và lương/giờ.",
    tone: "from-blue-500 to-cyan-500",
  },
  {
    icon: CalendarClock,
    title: "Lập lịch ca",
    description:
      "Trang Ca làm (g+s) cho phép xếp ca theo tuần. Có cảnh báo thiếu nhân sự, template, in tuần, và lịch tháng.",
    tone: "from-violet-500 to-purple-500",
  },
  {
    icon: ClipboardCheck,
    title: "Chấm công",
    description:
      "Nhân viên check-in qua Kiosk hoặc trang Của tôi. Báo cáo & lương tự động tính từ chấm công.",
    tone: "from-emerald-500 to-teal-500",
  },
  {
    icon: Sunrise,
    title: "Tóm tắt sáng & tuần",
    description:
      "Vào /standup để xem AI tóm tắt việc cần làm hôm nay, hoặc /weekly-insights cho recap tuần với 5 stat tiles + AI narrative.",
    tone: "from-fuchsia-500 to-purple-500",
  },
  {
    icon: TrendingUp,
    title: "Xu hướng & báo cáo",
    description:
      "/trends vẽ 12 tuần biểu đồ giờ, chấm công, kudos, đi muộn. /reports + /audit cho phân tích chuyên sâu.",
    tone: "from-cyan-500 to-blue-500",
  },
  {
    icon: MapIcon,
    title: "Sơ đồ trang",
    description:
      "Hơn 40 trang được nhóm trong /sitemap — tìm nhanh tính năng theo danh mục: Vận hành, Nhân sự, Phân tích, Hệ thống.",
    tone: "from-teal-500 to-emerald-500",
  },
  {
    icon: Keyboard,
    title: "Phím tắt",
    description:
      "Bấm `?` xem phím tắt. Ctrl+K mở thanh lệnh. `g + chữ` điều hướng nhanh kiểu vim.",
    tone: "from-rose-500 to-pink-500",
  },
];

type Props = {
  isAdmin: boolean;
};

export function OnboardingTour({ isAdmin }: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-show on first visit (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen === STORAGE_VALUE) return;
    const hasTrigger =
      typeof document !== "undefined" &&
      document.querySelector('[data-tour-trigger="auto"]') != null;
    const onHome =
      typeof window !== "undefined" && window.location.pathname === "/";
    if (!hasTrigger && !onHome) return;
    const t = setTimeout(() => {
      setStep(0);
      setVisible(true);
    }, 2000);
    return () => clearTimeout(t);
  }, [isAdmin]);

  // Listen for re-open event
  useEffect(() => {
    function onOpen() {
      setStep(0);
      setVisible(true);
    }
    document.addEventListener("open-onboarding-tour", onOpen as EventListener);
    return () =>
      document.removeEventListener(
        "open-onboarding-tour",
        onOpen as EventListener,
      );
  }, []);

  // Body scroll lock + Escape closes
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        finish();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function finish() {
    localStorage.setItem(STORAGE_KEY, STORAGE_VALUE);
    setVisible(false);
  }

  function next() {
    if (step >= STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  if (!visible) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-tour-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm animate-in fade-in"
        onClick={finish}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <button
          onClick={finish}
          aria-label="Đóng"
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>

        <div className="bg-gradient-to-br from-primary/15 via-accent/30 to-background px-6 pt-8 pb-6 text-center">
          <div
            className={`mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br ${current.tone} text-white shadow-lg`}
          >
            <Icon className="size-8" />
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Bước {step + 1} / {STEPS.length}
          </p>
          <h2
            id="onboarding-tour-title"
            className="text-xl font-bold tracking-tight"
          >
            {current.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {current.description}
          </p>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-3">
          {STEPS.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={finish}
            className="text-muted-foreground"
          >
            Bỏ qua
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prev}
              disabled={isFirst}
            >
              <ChevronLeft className="size-3.5" />
              Quay lại
            </Button>
            <Button size="sm" onClick={next}>
              {isLast ? (
                "Hoàn tất"
              ) : (
                <>
                  Tiếp
                  <ChevronRight className="size-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
