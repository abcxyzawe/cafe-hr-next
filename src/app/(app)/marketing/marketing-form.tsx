"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Hash,
  Loader2,
  Megaphone,
  MessageSquare,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateMarketingAction } from "./generate-action";
import {
  INITIAL_MARKETING_STATE,
  MARKETING_TONES,
  OFFER_MAX,
  TOPIC_MAX,
  isMarketingTone,
  type MarketingState,
} from "./marketing-types";
import type { MarketingTone } from "@/lib/xai";

type CardKey = "slogan" | "caption" | "ad";

const RESULT_META: Record<
  CardKey,
  { title: string; icon: typeof Sparkles; hint: string; max: number }
> = {
  slogan: {
    title: "Slogan",
    icon: Sparkles,
    hint: "Tối đa 12 từ — dùng làm tiêu đề ngắn",
    max: 100,
  },
  caption: {
    title: "Caption mạng xã hội",
    icon: MessageSquare,
    hint: "≤ 60 từ, có thể kèm 1–3 hashtag",
    max: 500,
  },
  ad: {
    title: "Bài quảng cáo Facebook",
    icon: Megaphone,
    hint: "≤ 100 từ, mở đầu hấp dẫn + CTA",
    max: 800,
  },
};

function ResultCard({
  cardKey,
  text,
}: {
  cardKey: CardKey;
  text: string;
}) {
  const meta = RESULT_META[cardKey];
  const Icon = meta.icon;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`Đã sao chép ${meta.title.toLowerCase()}`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Không sao chép được. Hãy thử chọn và Ctrl+C.");
    }
  }

  return (
    <div className="rounded-md border bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Icon className="size-3" />
            {meta.title}
          </div>
          <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-label={`Sao chép ${meta.title}`}
        >
          {copied ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copied ? "Đã chép" : "Sao chép"}
        </Button>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      <div className="mt-3 flex items-center justify-end text-[11px] tabular-nums text-muted-foreground">
        <span>
          {text.length.toLocaleString("vi-VN")} / {meta.max} ký tự
        </span>
      </div>
    </div>
  );
}

export function MarketingForm() {
  const [state, formAction, pending] = useActionState<
    MarketingState,
    FormData
  >(generateMarketingAction, INITIAL_MARKETING_STATE);

  const [topic, setTopic] = useState<string>(
    INITIAL_MARKETING_STATE.values.topic,
  );
  const [tone, setTone] = useState<MarketingTone>(
    INITIAL_MARKETING_STATE.values.tone,
  );
  const [offer, setOffer] = useState<string>(
    INITIAL_MARKETING_STATE.values.offer,
  );
  const lastErrorRef = useRef<string | null>(null);

  // Sync echoed values back when a successful submit returns
  useEffect(() => {
    if (state.result) {
      setTopic(state.values.topic);
      setOffer(state.values.offer);
      if (isMarketingTone(state.values.tone)) {
        setTone(state.values.tone);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.result]);

  useEffect(() => {
    if (state.error && state.error !== lastErrorRef.current) {
      lastErrorRef.current = state.error;
      toast.error(state.error);
    }
    if (!state.error) {
      lastErrorRef.current = null;
    }
  }, [state.error]);

  function handleTopicChange(e: ChangeEvent<HTMLInputElement>) {
    setTopic(e.target.value);
  }

  function handleOfferChange(e: ChangeEvent<HTMLInputElement>) {
    setOffer(e.target.value);
  }

  const result = state.result;
  const empty = topic.trim().length < 3 || offer.trim().length < 1;

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="mk-topic">Chủ đề chiến dịch</Label>
          <Input
            id="mk-topic"
            name="topic"
            value={topic}
            onChange={handleTopicChange}
            disabled={pending}
            maxLength={TOPIC_MAX}
            placeholder="Vd: Khai trương chi nhánh mới, Mùa hè cà phê dứa, Tri ân khách hàng..."
            required
          />
          <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>Càng cụ thể, AI viết càng đúng ý</span>
            <span>
              {topic.length}/{TOPIC_MAX}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tông giọng</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {MARKETING_TONES.map((opt) => {
              const active = tone === opt.value;
              return (
                <label
                  key={opt.value}
                  className={
                    "cursor-pointer rounded-md border p-3 text-sm transition-colors " +
                    (active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                      : "border-input hover:bg-accent/40")
                  }
                >
                  <input
                    type="radio"
                    name="tone"
                    value={opt.value}
                    checked={active}
                    onChange={() => setTone(opt.value)}
                    disabled={pending}
                    className="sr-only"
                  />
                  <div className="font-medium">{opt.label}</div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {opt.hint}
                  </p>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mk-offer">
            <span className="inline-flex items-center gap-1.5">
              <Hash className="size-3.5" />
              Ưu đãi / điểm nổi bật
            </span>
          </Label>
          <Input
            id="mk-offer"
            name="offer"
            value={offer}
            onChange={handleOfferChange}
            disabled={pending}
            maxLength={OFFER_MAX}
            placeholder="Vd: Mua 1 tặng 1 từ 14h–17h, freeship đơn từ 50k..."
            required
          />
          <div className="flex items-center justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>Nhắc rõ con số / mốc thời gian nếu có</span>
            <span>
              {offer.length}/{OFFER_MAX}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={pending || empty}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {pending ? "Đang tạo..." : "Tạo nội dung"}
          </Button>
        </div>
      </form>

      {pending && !result ? (
        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-primary" />
          AI đang viết slogan, caption và bài quảng cáo cho bạn...
        </div>
      ) : null}

      {result ? (
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="size-3" />
            Kết quả
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <ResultCard cardKey="slogan" text={result.slogan} />
            <ResultCard cardKey="caption" text={result.caption} />
            <ResultCard cardKey="ad" text={result.ad} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
