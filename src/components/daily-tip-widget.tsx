"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb, Coffee, Shuffle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tip = {
  id: number;
  category: "service" | "ops" | "people" | "money" | "safety";
  text: string;
};

const TIPS: Tip[] = [
  { id: 1, category: "service", text: "Cười khi nhận order — khách quay lại 30% nhiều hơn khi nhân viên niềm nở." },
  { id: 2, category: "ops", text: "Vệ sinh máy pha cà phê mỗi 2 giờ — giữ hương vị ổn định cả ngày." },
  { id: 3, category: "people", text: "Hỏi nhân viên 1 câu cảm ơn cụ thể mỗi tuần — gắn kết hơn lương thưởng." },
  { id: 4, category: "money", text: "Đếm tiền két mỗi đầu ca + cuối ca — phát hiện lệch sớm." },
  { id: 5, category: "ops", text: "Bổ sung sữa, đường, ly trước giờ cao điểm 30 phút." },
  { id: 6, category: "service", text: "Học tên 5 khách quen — họ kể với 5 người khác." },
  { id: 7, category: "safety", text: "Kiểm tra bình chữa cháy mỗi tháng — quy định + an toàn." },
  { id: 8, category: "people", text: "Cho nhân viên thử món mới trước khi đưa lên menu — họ sẽ tự tin tư vấn." },
  { id: 9, category: "money", text: "Combo + topping nhỏ tăng AOV ~15% mà không tăng chi phí lớn." },
  { id: 10, category: "ops", text: "Sắp xếp ca theo lưu lượng — đừng để 2 nhân viên đứng không vào 9h sáng." },
  { id: 11, category: "service", text: "WiFi mật khẩu in bảng to — khách không cần hỏi." },
  { id: 12, category: "people", text: "Sinh nhật nhân viên: 1 ly miễn phí + lời chúc — nhỏ mà ý nghĩa." },
  { id: 13, category: "ops", text: "Lau bàn ngay sau khi khách rời — tăng turnover bàn." },
  { id: 14, category: "money", text: "Xem báo cáo lương tuần — phát hiện ai làm quá nhiều giờ kẹt người." },
  { id: 15, category: "service", text: "Luôn có nước lọc miễn phí — khách ngồi lâu hơn = order thêm." },
  { id: 16, category: "ops", text: "Nguyên liệu gần hết hạn → chương trình ưu đãi cuối ngày." },
  { id: 17, category: "people", text: "Lịch ca công khai 7 ngày trước — nhân viên dễ sắp xếp việc riêng." },
  { id: 18, category: "safety", text: "Đường chạy trong bếp luôn khô — tai nạn 1 phút mất 1 ngày làm." },
  { id: 19, category: "service", text: "Ghi nhớ order \"không đường\" của khách quen — cảm xúc x10." },
  { id: 20, category: "money", text: "So sánh giá nhập sữa 3 nhà cung cấp mỗi quý — tiết kiệm 5-10%." },
  { id: 21, category: "ops", text: "Máy POS chậm? Khách đợi quá 2 phút mất hứng — bảo trì sớm." },
  { id: 22, category: "people", text: "Hỏi nhân viên ý kiến về menu — họ phục vụ trực tiếp, biết nhiều thứ." },
  { id: 23, category: "service", text: "Mưa to? Mời khách ô + một ly trà ấm — câu chuyện viral." },
  { id: 24, category: "ops", text: "Backup nguồn điện cho máy POS — mất điện 5 phút mất doanh thu giờ vàng." },
  { id: 25, category: "money", text: "Xem giờ cao điểm thật của quán → set khuyến mãi giờ thấp điểm." },
  { id: 26, category: "people", text: "Họp ngắn 5 phút đầu ca — sync nhanh mọi người về món mới / chú ý." },
  { id: 27, category: "service", text: "Khen ngợi món của khách (\"đẹp đó!\") — họ chụp + đăng + tag quán." },
  { id: 28, category: "ops", text: "Đặt timer cho mọi món có hạn — tránh phục vụ đồ cũ." },
  { id: 29, category: "safety", text: "Ai cầm dao luôn nói \"có dao đi qua\" — luật bếp cơ bản." },
  { id: 30, category: "people", text: "Nhân viên giỏi nhất nên có cơ hội đào tạo người mới — cả 2 cùng phát triển." },
  { id: 31, category: "money", text: "Ghi chú tip riêng — cuối ca chia công bằng. Đừng để cảm xúc lẫn vào." },
  { id: 32, category: "service", text: "Đáp \"Vâng ạ!\" thay vì \"OK\" — sang xịn hơn nhiều." },
];

const CATEGORY_META: Record<
  Tip["category"],
  { label: string; tone: string; emoji: string }
> = {
  service: { label: "Phục vụ", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", emoji: "🤝" },
  ops: { label: "Vận hành", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300", emoji: "⚙️" },
  people: { label: "Con người", tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300", emoji: "👥" },
  money: { label: "Tiền bạc", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300", emoji: "💰" },
  safety: { label: "An toàn", tone: "bg-rose-500/15 text-rose-700 dark:text-rose-300", emoji: "🛡️" },
};

const STORAGE_KEY = "cafe-hr-tip-overrides";

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function pickTipForToday(): Tip {
  const idx = dayOfYear(new Date()) % TIPS.length;
  return TIPS[idx];
}

function pickRandomTip(excludeId: number): Tip {
  let pick = TIPS[Math.floor(Math.random() * TIPS.length)];
  let attempts = 0;
  while (pick.id === excludeId && attempts < 5) {
    pick = TIPS[Math.floor(Math.random() * TIPS.length)];
    attempts++;
  }
  return pick;
}

export function DailyTipWidget() {
  const todayTip = useMemo(pickTipForToday, []);
  const [activeTip, setActiveTip] = useState<Tip>(todayTip);
  const [hidden, setHidden] = useState(false);

  // After hydration, prefer override if user shuffled today
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { date?: string; id?: number };
        if (
          parsed.date === new Date().toISOString().slice(0, 10) &&
          typeof parsed.id === "number"
        ) {
          const found = TIPS.find((t) => t.id === parsed.id);
          if (found) setActiveTip(found);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function shuffle() {
    const next = pickRandomTip(activeTip.id);
    setActiveTip(next);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ date: new Date().toISOString().slice(0, 10), id: next.id }),
      );
    } catch {
      // ignore
    }
  }

  if (hidden) return null;

  const meta = CATEGORY_META[activeTip.category];

  return (
    <Card className="overflow-hidden bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/5">
      <CardContent className="flex items-start gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md">
          <Lightbulb className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Coffee className="size-3" />
              Mẹo vận hành quán hôm nay
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                meta.tone,
              )}
            >
              {meta.emoji} {meta.label}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium leading-snug">
            {activeTip.text}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={shuffle}
            title="Mẹo khác"
            aria-label="Đổi mẹo"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Shuffle className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setHidden(true)}
            title="Ẩn"
            aria-label="Ẩn mẹo"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
