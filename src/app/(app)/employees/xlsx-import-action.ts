"use server";

import { revalidatePath } from "next/cache";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 500;
const PREVIEW_ROWS = 50;

const VALID_ROLES = new Set(["barista", "server", "cashier", "manager"]);
type EmployeeRole = "barista" | "server" | "cashier" | "manager";

export type XlsxPreviewResult = {
  ok: boolean;
  columns?: string[];
  rows?: string[][];
  error?: string;
};

export type XlsxImportResult = {
  ok: boolean;
  imported?: number;
  skipped?: number;
  errors?: Array<{ row: number; reason: string }>;
};

const FIELD_KEYS = [
  "name",
  "role",
  "email",
  "phone",
  "hourlyRate",
  "dateOfBirth",
] as const;
type FieldKey = (typeof FIELD_KEYS)[number];

type Mapping = Partial<Record<FieldKey, number>>;

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((rt) => rt.text ?? "").join("").trim();
    }
    if ("result" in value) {
      const r = (value as { result?: ExcelJS.CellValue }).result;
      if (r !== undefined && r !== null) return cellToString(r);
    }
    if ("hyperlink" in value && typeof value.hyperlink === "string") {
      return value.hyperlink;
    }
  }
  return String(value);
}

async function loadSheetRows(file: File): Promise<string[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    const last = row.cellCount;
    for (let c = 1; c <= last; c++) {
      cells.push(cellToString(row.getCell(c).value));
    }
    if (cells.some((v) => v.length > 0)) out.push(cells);
  });
  return out;
}

export async function parseXlsxPreview(
  formData: FormData,
): Promise<XlsxPreviewResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Vui lòng chọn file .xlsx" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File quá lớn (max 5MB)" };
  }
  try {
    const rows = await loadSheetRows(file);
    if (rows.length < 1) {
      return { ok: false, error: "File rỗng" };
    }
    const columns = rows[0];
    const data = rows.slice(1, 1 + PREVIEW_ROWS);
    return { ok: true, columns, rows: data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Không đọc được file",
    };
  }
}

function parseMapping(raw: FormDataEntryValue | null): Mapping | null {
  if (typeof raw !== "string") return null;
  try {
    const obj: unknown = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    const mapping: Mapping = {};
    for (const k of FIELD_KEYS) {
      const v = (obj as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
        mapping[k] = v;
      }
    }
    return mapping;
  } catch {
    return null;
  }
}

function parseRate(raw: string): number | null {
  if (!raw) return 30000;
  const cleaned = raw.replace(/[,\s₫đVND]/gi, "");
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDob(raw: string): Date | null | "invalid" {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? "invalid" : d;
  }
  // Try dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const day = Number(m[1]);
    const mon = Number(m[2]);
    const yr = Number(m[3]);
    const d = new Date(Date.UTC(yr, mon - 1, day));
    if (
      d.getUTCFullYear() === yr &&
      d.getUTCMonth() === mon - 1 &&
      d.getUTCDate() === day
    ) {
      return d;
    }
  }
  return "invalid";
}

export async function importXlsxEmployees(
  formData: FormData,
): Promise<XlsxImportResult> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, errors: [{ row: 0, reason: "Chỉ admin được phép" }] };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: [{ row: 0, reason: "Vui lòng chọn file" }] };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, errors: [{ row: 0, reason: "File quá lớn (max 5MB)" }] };
  }
  const mapping = parseMapping(formData.get("mapping"));
  if (!mapping) {
    return { ok: false, errors: [{ row: 0, reason: "Mapping không hợp lệ" }] };
  }
  if (mapping.name === undefined || mapping.role === undefined) {
    return {
      ok: false,
      errors: [{ row: 0, reason: "Phải map cột 'name' và 'role'" }],
    };
  }

  let allRows: string[][];
  try {
    allRows = await loadSheetRows(file);
  } catch (e) {
    return {
      ok: false,
      errors: [
        { row: 0, reason: e instanceof Error ? e.message : "Không đọc được file" },
      ],
    };
  }
  if (allRows.length < 2) {
    return { ok: false, errors: [{ row: 0, reason: "File không có dữ liệu" }] };
  }
  const dataRows = allRows.slice(1);
  if (dataRows.length > MAX_ROWS) {
    return {
      ok: false,
      errors: [{ row: 0, reason: `Quá nhiều dòng (max ${MAX_ROWS})` }],
    };
  }

  const errors: Array<{ row: number; reason: string }> = [];
  const candidates: Array<{
    name: string;
    role: EmployeeRole;
    phone: string | null;
    email: string | null;
    hourlyRate: number;
    dateOfBirth: Date | null;
  }> = [];

  const get = (row: string[], idx: number | undefined): string => {
    if (idx === undefined) return "";
    const v = row[idx];
    return typeof v === "string" ? v.trim() : "";
  };

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // header is row 1
    const name = get(row, mapping.name);
    const roleRaw = get(row, mapping.role).toLowerCase();
    const phone = get(row, mapping.phone) || null;
    const email = get(row, mapping.email) || null;
    const rateRaw = get(row, mapping.hourlyRate);
    const dobRaw = get(row, mapping.dateOfBirth);

    if (!name) {
      errors.push({ row: rowNum, reason: "Thiếu name" });
      continue;
    }
    if (!VALID_ROLES.has(roleRaw)) {
      errors.push({
        row: rowNum,
        reason: `Role không hợp lệ: '${roleRaw}' (chấp nhận: barista, server, cashier, manager)`,
      });
      continue;
    }
    const rate = parseRate(rateRaw);
    if (rate === null) {
      errors.push({ row: rowNum, reason: `Lương không hợp lệ: '${rateRaw}'` });
      continue;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ row: rowNum, reason: `Email không hợp lệ: '${email}'` });
      continue;
    }
    const dob = parseDob(dobRaw);
    if (dob === "invalid") {
      errors.push({ row: rowNum, reason: `Ngày sinh không hợp lệ: '${dobRaw}'` });
      continue;
    }
    candidates.push({
      name,
      role: roleRaw as EmployeeRole,
      phone,
      email,
      hourlyRate: rate,
      dateOfBirth: dob,
    });
  }

  // Dedupe by email (skip existing in DB + duplicates within the file)
  const emails = candidates
    .map((c) => c.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);
  let existingEmails = new Set<string>();
  if (emails.length > 0) {
    const existing = await prisma.employee.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });
    existingEmails = new Set(
      existing
        .map((e) => e.email)
        .filter((e): e is string => typeof e === "string"),
    );
  }
  const seenInBatch = new Set<string>();
  let skipped = 0;
  const toCreate: typeof candidates = [];
  for (const c of candidates) {
    if (c.email) {
      if (existingEmails.has(c.email) || seenInBatch.has(c.email)) {
        skipped++;
        continue;
      }
      seenInBatch.add(c.email);
    }
    toCreate.push(c);
  }

  if (toCreate.length === 0) {
    return { ok: false, imported: 0, skipped, errors };
  }

  try {
    await prisma.employee.createMany({ data: toCreate });
    await logActivity({
      action: "employee.import",
      entityType: "employee",
      summary: `Import Excel: ${toCreate.length} nhân viên${skipped ? `, bỏ qua ${skipped} trùng email` : ""}${errors.length ? `, ${errors.length} dòng lỗi` : ""}`,
      metadata: {
        imported: toCreate.length,
        skipped,
        errors: errors.length,
        source: "xlsx",
      },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true, imported: toCreate.length, skipped, errors };
  } catch (e) {
    return {
      ok: false,
      imported: 0,
      skipped,
      errors: [
        ...errors,
        { row: 0, reason: e instanceof Error ? e.message : "Lỗi DB" },
      ],
    };
  }
}
