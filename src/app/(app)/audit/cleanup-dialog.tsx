"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2, Eye, Loader2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  previewCleanup,
  purgeOldActivities,
} from "./cleanup-actions";

const DAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 30, label: "30 ngày" },
  { value: 90, label: "90 ngày" },
  { value: 180, label: "180 ngày" },
  { value: 365, label: "1 năm" },
];

type PreviewState = {
  days: number;
  count: number;
  cutoffIso: string;
};

function formatCutoff(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function CleanupDialog() {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(90);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewing, startPreview] = useTransition();
  const [purging, startPurge] = useTransition();

  function reset() {
    setDays(90);
    setPreview(null);
  }

  function handleOpenChange(next: boolean) {
    if (purging) return;
    setOpen(next);
    if (!next) reset();
  }

  function onDaysChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = Number(e.target.value);
    setDays(v);
    setPreview(null);
  }

  function onPreview() {
    startPreview(async () => {
      const res = await previewCleanup(days);
      if (!res.ok || res.count === undefined || !res.cutoffIso) {
        toast.error(res.error || "Không xem trước được");
        return;
      }
      setPreview({ days, count: res.count, cutoffIso: res.cutoffIso });
    });
  }

  function onPurge() {
    if (!preview) {
      toast.error("Vui lòng xem trước trước khi xoá");
      return;
    }
    startPurge(async () => {
      const res = await purgeOldActivities(preview.days);
      if (!res.ok || res.deleted === undefined) {
        toast.error(res.error || "Không xoá được nhật ký");
        return;
      }
      toast.success(`Đã xoá ${res.deleted} mục`);
      setOpen(false);
      reset();
    });
  }

  const previewStale = preview !== null && preview.days !== days;
  const canPurge = preview !== null && !previewStale && preview.count > 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Dọn dẹp
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-md"
          onClose={purging ? undefined : () => handleOpenChange(false)}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-600" />
              Dọn dẹp nhật ký cũ
            </DialogTitle>
            <DialogDescription>
              Xoá vĩnh viễn các bản ghi ActivityLog cũ hơn khoảng thời gian đã chọn.
              Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="cleanup-days" className="mb-1.5 block text-xs">
                Xoá nhật ký cũ hơn
              </Label>
              <Select
                id="cleanup-days"
                value={String(days)}
                onChange={onDaysChange}
                disabled={previewing || purging}
              >
                {DAY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPreview}
                disabled={previewing || purging}
              >
                {previewing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Eye className="size-4" />
                )}
                Xem trước
              </Button>

              {preview && !previewStale && (
                <div className="rounded-md border bg-muted/40 p-3 text-sm">
                  Sẽ xoá <strong>{preview.count}</strong> mục
                  {" "}(tạo trước {formatCutoff(preview.cutoffIso)}).
                </div>
              )}
              {previewStale && (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Bạn đã đổi khoảng thời gian. Vui lòng nhấn &ldquo;Xem trước&rdquo; lại.
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenChange(false)}
                disabled={purging}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onPurge}
                disabled={!canPurge || purging}
                className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600"
              >
                {purging ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Xác nhận xoá
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
