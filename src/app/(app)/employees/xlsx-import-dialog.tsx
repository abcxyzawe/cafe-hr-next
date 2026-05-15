"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  importXlsxEmployees,
  parseXlsxPreview,
  type XlsxImportResult,
} from "./xlsx-import-action";

type FieldKey =
  | "name"
  | "role"
  | "email"
  | "phone"
  | "hourlyRate"
  | "dateOfBirth";

type FieldDef = {
  key: FieldKey;
  label: string;
  required: boolean;
  hints: string[];
};

const FIELDS: FieldDef[] = [
  { key: "name", label: "Họ tên", required: true, hints: ["name", "họ tên", "ho ten", "fullname", "full name", "tên"] },
  { key: "role", label: "Vai trò", required: true, hints: ["role", "vai trò", "vai tro", "chức vụ", "chuc vu", "position"] },
  { key: "email", label: "Email", required: false, hints: ["email", "e-mail", "mail"] },
  { key: "phone", label: "Số điện thoại", required: false, hints: ["phone", "sđt", "sdt", "số điện thoại", "so dien thoai", "tel", "mobile"] },
  { key: "hourlyRate", label: "Lương/giờ", required: false, hints: ["hourly_rate", "hourlyrate", "rate", "lương", "luong", "lương/giờ", "salary", "wage"] },
  { key: "dateOfBirth", label: "Ngày sinh", required: false, hints: ["dob", "date of birth", "ngày sinh", "ngay sinh", "birth", "birthday", "dateofbirth", "date_of_birth"] },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function autoMap(columns: string[]): Record<FieldKey, number | undefined> {
  const normCols = columns.map((c) => normalize(c));
  const used = new Set<number>();
  const result: Record<FieldKey, number | undefined> = {
    name: undefined,
    role: undefined,
    email: undefined,
    phone: undefined,
    hourlyRate: undefined,
    dateOfBirth: undefined,
  };
  for (const f of FIELDS) {
    const normHints = f.hints.map(normalize);
    // Exact match first
    let found = -1;
    for (let i = 0; i < normCols.length; i++) {
      if (used.has(i)) continue;
      if (normHints.includes(normCols[i])) {
        found = i;
        break;
      }
    }
    // Fallback: contains
    if (found === -1) {
      for (let i = 0; i < normCols.length; i++) {
        if (used.has(i)) continue;
        const col = normCols[i];
        if (normHints.some((h) => h.length >= 3 && (col.includes(h) || h.includes(col)))) {
          found = i;
          break;
        }
      }
    }
    if (found >= 0) {
      result[f.key] = found;
      used.add(found);
    }
  }
  return result;
}

type Step = "upload" | "map" | "preview";

export function XlsxImportButton() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number | undefined>>({
    name: undefined,
    role: undefined,
    email: undefined,
    phone: undefined,
    hourlyRate: undefined,
    dateOfBirth: undefined,
  });
  const [parsing, startParse] = useTransition();
  const [importing, startImport] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<XlsxImportResult | null>(null);

  function reset() {
    setStep("upload");
    setFile(null);
    setColumns([]);
    setPreviewRows([]);
    setMapping({
      name: undefined,
      role: undefined,
      email: undefined,
      phone: undefined,
      hourlyRate: undefined,
      dateOfBirth: undefined,
    });
    setParseError(null);
    setResult(null);
  }

  function handleClose() {
    setOpen(false);
    // Slight delay so the dialog closes cleanly before resetting state
    setTimeout(reset, 150);
  }

  function handleFileChange(f: File | null) {
    setFile(f);
    setParseError(null);
    setResult(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setParseError("File quá lớn (max 5MB)");
      return;
    }
    const fd = new FormData();
    fd.append("file", f);
    startParse(async () => {
      const res = await parseXlsxPreview(fd);
      if (!res.ok || !res.columns) {
        setParseError(res.error ?? "Không đọc được file");
        return;
      }
      setColumns(res.columns);
      setPreviewRows(res.rows ?? []);
      setMapping(autoMap(res.columns));
      setStep("map");
    });
  }

  const canGoPreview = mapping.name !== undefined && mapping.role !== undefined;

  const previewMapped = useMemo(() => {
    return previewRows.slice(0, 5).map((row) => {
      const out: Record<FieldKey, string> = {
        name: "",
        role: "",
        email: "",
        phone: "",
        hourlyRate: "",
        dateOfBirth: "",
      };
      for (const f of FIELDS) {
        const idx = mapping[f.key];
        if (idx !== undefined) out[f.key] = row[idx] ?? "";
      }
      return out;
    });
  }, [previewRows, mapping]);

  function handleImport() {
    if (!file) return;
    if (!canGoPreview) return;
    const cleanMapping: Partial<Record<FieldKey, number>> = {};
    for (const k of Object.keys(mapping) as FieldKey[]) {
      const v = mapping[k];
      if (v !== undefined) cleanMapping[k] = v;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(cleanMapping));
    startImport(async () => {
      const res = await importXlsxEmployees(fd);
      setResult(res);
      if (res.ok) {
        const parts = [`Đã import ${res.imported ?? 0} nhân viên`];
        if (res.skipped) parts.push(`bỏ qua ${res.skipped} trùng email`);
        toast.success(parts.join(", "));
        if (!res.errors || res.errors.length === 0) {
          handleClose();
        }
      } else {
        toast.error("Import thất bại");
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="size-4" />
        Import Excel
      </Button>
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent onClose={handleClose} className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import nhân viên từ Excel</DialogTitle>
            <DialogDescription>
              {step === "upload" && "Bước 1/3: Tải lên file .xlsx"}
              {step === "map" && "Bước 2/3: Khớp cột trong file với trường dữ liệu"}
              {step === "preview" && "Bước 3/3: Xem trước và xác nhận import"}
            </DialogDescription>
          </DialogHeader>

          {step === "upload" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="xlsx-file">Chọn file Excel</Label>
                <input
                  id="xlsx-file"
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={parsing}
                  onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-md border border-input bg-transparent text-sm file:mr-3 file:cursor-pointer file:rounded-l-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
                />
                <p className="text-xs text-muted-foreground">
                  Tối đa 5MB · 500 dòng. Hỗ trợ định dạng .xlsx và .xls.
                </p>
              </div>
              {parsing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Đang đọc file...
                </div>
              )}
              {parseError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Đóng
                </Button>
              </div>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Đã đọc <strong>{previewRows.length}</strong> dòng dữ liệu, {columns.length} cột.
                Trường có dấu <span className="text-destructive">*</span> là bắt buộc.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={`map-${f.key}`}>
                      {f.label}
                      {f.required && <span className="text-destructive"> *</span>}
                    </Label>
                    <Select
                      id={`map-${f.key}`}
                      value={mapping[f.key] === undefined ? "" : String(mapping[f.key])}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMapping((prev) => ({
                          ...prev,
                          [f.key]: v === "" ? undefined : Number(v),
                        }));
                      }}
                    >
                      <option value="">— Bỏ qua —</option>
                      {columns.map((col, i) => (
                        <option key={i} value={i}>
                          {col || `(Cột ${i + 1})`}
                        </option>
                      ))}
                    </Select>
                  </div>
                ))}
              </div>
              {!canGoPreview && (
                <p className="text-xs text-destructive">
                  Cần chọn cột cho Họ tên và Vai trò trước khi tiếp tục.
                </p>
              )}
              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("upload")}
                >
                  <ArrowLeft className="size-4" />
                  Quay lại
                </Button>
                <Button
                  type="button"
                  disabled={!canGoPreview}
                  onClick={() => setStep("preview")}
                >
                  Tiếp tục
                </Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Xem trước 5 dòng đầu (tổng {previewRows.length} dòng sẽ được xử lý).
              </p>
              <div className="overflow-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {FIELDS.map((f) => (
                        <th key={f.key} className="px-2 py-1.5 text-left font-medium">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewMapped.map((row, i) => (
                      <tr key={i} className="border-t">
                        {FIELDS.map((f) => (
                          <td key={f.key} className="max-w-32 truncate px-2 py-1.5">
                            {row[f.key] || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result && result.errors && result.errors.length > 0 && (
                <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-destructive">
                    <AlertCircle className="size-4" />
                    {result.ok ? "Một số dòng bị bỏ qua" : "Có lỗi"}
                  </div>
                  <ul className="max-h-32 list-inside list-disc space-y-0.5 overflow-auto text-xs">
                    {result.errors.slice(0, 10).map((e, i) => (
                      <li key={i}>
                        Dòng {e.row}: {e.reason}
                      </li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>...và {result.errors.length - 10} lỗi khác</li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("map")}
                  disabled={importing}
                >
                  <ArrowLeft className="size-4" />
                  Quay lại
                </Button>
                <Button type="button" onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Import {previewRows.length} nhân viên
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
