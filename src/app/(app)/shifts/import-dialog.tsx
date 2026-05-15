"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  FileSpreadsheet,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importShiftsCsv, type ShiftImportResult } from "./actions";

const initial: ShiftImportResult = { ok: false };

export function ShiftImportButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(importShiftsCsv, initial);

  useEffect(() => {
    if (state.ok && state.imported) {
      toast.success(`Đã import ${state.imported} ca`);
    }
  }, [state]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="size-4" />
        Import CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import lịch ca từ CSV</DialogTitle>
            <DialogDescription>
              File phải có header: <code>employee_id, date, shift_type</code>.
              shift_type ∈ <code>morning</code> / <code>afternoon</code> /{" "}
              <code>evening</code>. Ca trùng (cùng NV + ngày + loại) sẽ tự bỏ
              qua.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm">
                <p className="font-medium">Tải template mẫu</p>
                <p className="text-xs text-muted-foreground">
                  CSV với header chuẩn + 5 dòng ví dụ cho 7 ngày tới
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/api/shifts/template.csv" prefetch={false}>
                  <Download className="size-4" />
                  Tải
                </Link>
              </Button>
            </div>
          </div>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="shift-csv-file">Chọn file .csv</Label>
              <input
                id="shift-csv-file"
                type="file"
                name="file"
                accept=".csv,text/csv"
                required
                className="block w-full cursor-pointer rounded-md border border-input bg-transparent text-sm file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
              />
            </div>

            {state.errors && state.errors.length > 0 && (
              <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive">
                  <AlertCircle className="size-4" />
                  {state.ok ? "Một số dòng bị bỏ qua" : "Có lỗi"}
                </div>
                <ul className="max-h-40 list-inside list-disc space-y-0.5 overflow-auto text-xs">
                  {state.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      {e.row > 0 ? `Dòng ${e.row}: ` : ""}
                      {e.reason}
                    </li>
                  ))}
                  {state.errors.length > 10 && (
                    <li>...và {state.errors.length - 10} lỗi khác</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Đóng
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Import
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
