"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Cake, Copy, Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateBirthdayCardAction } from "./birthday-card-action";

export function BirthdayCardDialog({
  employeeId,
  employeeName,
}: {
  employeeId: number;
  employeeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [wish, setWish] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [downloading, setDownloading] = useState(false);

  function reset() {
    setWish("");
    setImageUrl("");
    setError("");
  }

  function generate() {
    setError("");
    startTransition(async () => {
      const res = await generateBirthdayCardAction(employeeId);
      if (res.ok) {
        setWish(res.wish);
        setImageUrl(res.imageUrl);
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  // Auto-generate on open if we have nothing yet
  useEffect(() => {
    if (open && !wish && !imageUrl && !pending && !error) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose(next: boolean) {
    if (pending || downloading) return;
    setOpen(next);
    if (!next) reset();
  }

  async function copyWish() {
    if (!wish) return;
    try {
      await navigator.clipboard.writeText(wish);
      toast.success("Đã sao chép");
    } catch {
      toast.error("Không sao chép được");
    }
  }

  async function downloadImage() {
    if (!imageUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const safeName = employeeName.replace(/[^\p{L}\p{N}_-]+/gu, "_") || "nhanvien";
      a.download = `thiep-sinh-nhat-${safeName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Đã tải ảnh");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không tải được ảnh");
    } finally {
      setDownloading(false);
    }
  }

  const hasContent = wish.length > 0 && imageUrl.length > 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        title="Tạo thiệp sinh nhật bằng AI"
      >
        <Cake className="size-4" />
        <span className="hidden sm:inline">Tạo thiệp sinh nhật</span>
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className="max-w-xl"
          onClose={() => handleClose(false)}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cake className="size-5 text-amber-500" />
              Thiệp sinh nhật cho {employeeName}
            </DialogTitle>
            <DialogDescription>
              AI sẽ tạo một lời chúc ấm áp và một bức tranh sinh nhật theo phong cách quán cà phê.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {pending && !hasContent && (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="size-8 animate-spin text-amber-500" />
                <p className="text-sm">Đang vẽ thiệp...</p>
              </div>
            )}

            {!pending && error && !hasContent && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {hasContent && (
              <div className="space-y-4">
                <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border bg-muted shadow-sm">
                  <Image
                    src={imageUrl}
                    alt={`Thiệp sinh nhật cho ${employeeName}`}
                    fill
                    sizes="(max-width: 640px) 90vw, 384px"
                    className="object-cover"
                    unoptimized
                  />
                  {pending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                      <Loader2 className="size-8 animate-spin text-amber-500" />
                    </div>
                  )}
                </div>

                <div className="rounded-xl border bg-amber-50/60 p-4 text-center text-base leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                  {wish}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generate}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                Tạo lại
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyWish}
                disabled={pending || !wish}
              >
                <Copy className="size-4" />
                Sao chép
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadImage}
                disabled={pending || downloading || !imageUrl}
              >
                {downloading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                Tải ảnh
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleClose(false)}
                disabled={pending || downloading}
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
