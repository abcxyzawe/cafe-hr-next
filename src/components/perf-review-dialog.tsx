"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  RotateCcw,
  Copy,
  ClipboardCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  generatePerfReviewAction,
  listEmployeesForReviewAction,
  type PerfReviewPeriod,
  type PerfReviewTone,
  type PerfReviewEmployeeOption,
} from "@/components/perf-review-action";

type Props = {
  employeeId?: number;
  employeeName?: string;
};

const PERIOD_OPTIONS: Array<{ id: PerfReviewPeriod; label: string }> = [
  { id: "week", label: "Tuần" },
  { id: "month", label: "Tháng" },
];

const TONE_OPTIONS: Array<{
  id: PerfReviewTone;
  label: string;
  hint: string;
}> = [
  { id: "balanced", label: "Cân bằng", hint: "Khen + góp ý công tâm" },
  { id: "encouraging", label: "Khuyến khích", hint: "Động viên tích cực" },
  { id: "critical", label: "Nghiêm khắc", hint: "Thẳng thắn, gợi ý cụ thể" },
];

export function PerfReviewDialog({ employeeId, employeeName }: Props) {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<PerfReviewEmployeeOption[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<number | "">(
    employeeId ?? "",
  );
  const [period, setPeriod] = useState<PerfReviewPeriod>("week");
  const [tone, setTone] = useState<PerfReviewTone>("balanced");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (employeeId) return;
    if (employees.length > 0) return;
    setLoadingList(true);
    listEmployeesForReviewAction()
      .then((res) => {
        if (res.ok) {
          setEmployees(res.employees);
          if (res.employees.length > 0 && selectedId === "") {
            setSelectedId(res.employees[0].id);
          }
        } else {
          toast.error(res.error);
        }
      })
      .catch(() => toast.error("Không tải được danh sách nhân viên"))
      .finally(() => setLoadingList(false));
  }, [open, employeeId, employees.length, selectedId]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  function handleClose(): void {
    setOpen(false);
  }

  function handleGenerate(): void {
    const id = typeof selectedId === "number" ? selectedId : Number(selectedId);
    if (!Number.isInteger(id) || id <= 0) {
      toast.error("Vui lòng chọn một nhân viên");
      return;
    }
    startTransition(async () => {
      const res = await generatePerfReviewAction(id, period, tone);
      if (res.ok) {
        setDraft(res.content);
      } else {
        toast.error(res.error || "Không tạo được đánh giá");
      }
    });
  }

  function handleRegenerate(): void {
    setDraft("");
    handleGenerate();
  }

  async function handleCopy(): Promise<void> {
    const text = draft.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Đã sao chép vào clipboard");
    } catch {
      toast.error("Không sao chép được");
    }
  }

  const showDraft = draft.length > 0;
  const selectedEmployee = employeeId
    ? { id: employeeId, name: employeeName ?? "", role: "" }
    : employees.find((e) => e.id === selectedId);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        title="Tạo đánh giá hiệu suất bằng AI"
      >
        <Sparkles className="size-4" />
        Tạo đánh giá AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" onClose={handleClose}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" />
              Đánh giá hiệu suất bằng AI
            </DialogTitle>
            <DialogDescription>
              AI sẽ viết bản nháp tiếng Việt (~80-120 từ) dựa trên số liệu thật
              của nhân viên trong kỳ.
            </DialogDescription>
          </DialogHeader>

          {!showDraft && (
            <div className="space-y-4">
              {!employeeId && (
                <div>
                  <label
                    htmlFor="perf-review-emp"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Nhân viên
                  </label>
                  <Select
                    id="perf-review-emp"
                    value={selectedId === "" ? "" : String(selectedId)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSelectedId(v === "" ? "" : Number(v));
                    }}
                    disabled={pending || loadingList}
                  >
                    {loadingList && <option value="">Đang tải…</option>}
                    {!loadingList && employees.length === 0 && (
                      <option value="">Chưa có nhân viên</option>
                    )}
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              {employeeId && employeeName && (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  Nhân viên:{" "}
                  <span className="font-medium text-foreground">
                    {employeeName}
                  </span>
                </div>
              )}

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Kỳ đánh giá
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PERIOD_OPTIONS.map((p) => (
                    <label
                      key={p.id}
                      className={
                        "flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition " +
                        (period === p.id
                          ? "border-primary bg-primary/10 font-medium text-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-accent")
                      }
                    >
                      <input
                        type="radio"
                        name="perf-period"
                        value={p.id}
                        checked={period === p.id}
                        onChange={() => setPeriod(p.id)}
                        className="sr-only"
                        disabled={pending}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tông giọng
                </span>
                <div className="grid gap-2">
                  {TONE_OPTIONS.map((t) => (
                    <label
                      key={t.id}
                      className={
                        "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition " +
                        (tone === t.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-accent")
                      }
                    >
                      <input
                        type="radio"
                        name="perf-tone"
                        value={t.id}
                        checked={tone === t.id}
                        onChange={() => setTone(t.id)}
                        className="mt-0.5"
                        disabled={pending}
                      />
                      <span className="flex-1">
                        <span className="block font-medium text-foreground">
                          {t.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {t.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={pending}
                >
                  Huỷ
                </Button>
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={
                    pending ||
                    loadingList ||
                    !selectedEmployee ||
                    (!employeeId && selectedId === "")
                  }
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Tạo đánh giá
                </Button>
              </div>
            </div>
          )}

          {showDraft && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="perf-review-draft"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Bản nháp (chỉnh sửa nếu cần)
                </label>
                <textarea
                  id="perf-review-draft"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={10}
                  className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[180px]"
                  disabled={pending}
                />
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Bạn có thể chỉnh sửa rồi sao chép sang nơi khác.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRegenerate}
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RotateCcw className="size-4" />
                  )}
                  Tạo lại
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    disabled={pending}
                  >
                    Đóng
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCopy}
                    disabled={pending || draft.trim().length === 0}
                  >
                    {copied ? (
                      <ClipboardCheck className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    Sao chép
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
