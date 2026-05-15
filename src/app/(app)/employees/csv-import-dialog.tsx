"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, FileSpreadsheet, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importEmployeesCsv, type ImportResult } from "./actions";

const initial: ImportResult = { ok: false };

export function CsvImportButton() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(importEmployeesCsv, initial);

  useEffect(() => {
    if (state.ok && state.imported) {
      toast.success(`Đã import ${state.imported} nhân viên`);
    }
  }, [state]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="size-4" />
        Import CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import nhân viên từ CSV</DialogTitle>
            <DialogDescription>
              File phải có header: <code>name, role, phone, email, hourly_rate</code>.
              Role hợp lệ: <code>barista</code>, <code>server</code>, <code>cashier</code>,{" "}
              <code>manager</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <div className="relative size-12 overflow-hidden rounded-md">
              <Image
                src="/assets/csv-import.jpg"
                alt="Ví dụ định dạng CSV"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium">Chưa có file mẫu?</p>
              <p className="text-xs text-muted-foreground">
                Tải template CSV với cột chuẩn và 2 dòng ví dụ
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/api/employees/template.csv" prefetch={false}>
                <Download className="size-4" />
                Tải template
              </Link>
            </Button>
          </div>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="csv-file">Chọn file .csv</Label>
              <input
                id="csv-file"
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
                <ul className="max-h-32 list-inside list-disc space-y-0.5 overflow-auto text-xs">
                  {state.errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      Dòng {e.row}: {e.reason}
                    </li>
                  ))}
                  {state.errors.length > 10 && (
                    <li>...và {state.errors.length - 10} lỗi khác</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
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
