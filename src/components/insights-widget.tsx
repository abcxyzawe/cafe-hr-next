"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { refreshInsights } from "@/app/(app)/insights-actions";

type Insight = { emoji: string; text: string };

export function InsightsWidget({
  initial,
  isAdmin,
}: {
  initial: Insight[];
  isAdmin: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const res = await refreshInsights();
      if (res.ok && res.insights) {
        setItems(res.insights);
        toast.success("Đã cập nhật phân tích");
      } else {
        toast.error(res.error || "Không cập nhật được");
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="size-5" />
          </div>
          <div>
            <CardTitle>Phân tích nhanh</CardTitle>
            <CardDescription>
              Tóm tắt vận hành quán dựa trên số liệu 30 ngày gần nhất
            </CardDescription>
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            disabled={pending}
            onClick={refresh}
            title="Làm mới phân tích"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border bg-card/40 p-3"
            >
              <span className="text-2xl leading-none">{item.emoji}</span>
              <p className="flex-1 text-sm leading-relaxed">{item.text}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
