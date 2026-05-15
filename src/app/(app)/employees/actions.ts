"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { generateImage, avatarPromptFor } from "@/lib/xai";
import { logActivity } from "@/lib/activity";
import { getSession } from "@/lib/auth";
import { ROLE_LABELS, formatVND } from "@/lib/utils";

const employeeSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  role: z.enum(["barista", "server", "cashier", "manager"]),
  phone: z.string().optional().nullable(),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")).nullable(),
  hourlyRate: z.coerce.number().min(0, "Lương phải >= 0"),
  dateOfBirth: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v) : null)),
});

export type EmployeeFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    hourlyRate: formData.get("hourlyRate"),
    dateOfBirth: formData.get("dateOfBirth") || null,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const autoAvatar = formData.get("autoAvatar") === "on";
  try {
    const created = await prisma.employee.create({
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        hourlyRate: parsed.data.hourlyRate,
        dateOfBirth: parsed.data.dateOfBirth,
      },
    });
    await logActivity({
      action: "employee.create",
      entityType: "employee",
      entityId: created.id,
      summary: `Thêm nhân viên ${created.name} (${ROLE_LABELS[created.role] ?? created.role})`,
    });
    if (autoAvatar) {
      // Don't fail the whole create if avatar gen fails
      try {
        await generateAndSaveAvatar(created);
      } catch (e) {
        console.warn("auto-avatar failed:", e instanceof Error ? e.message : e);
      }
    }
    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function updateEmployee(
  id: number,
  _prev: EmployeeFormState,
  formData: FormData,
): Promise<EmployeeFormState> {
  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    role: formData.get("role"),
    phone: formData.get("phone") || null,
    email: formData.get("email") || null,
    hourlyRate: formData.get("hourlyRate"),
    dateOfBirth: formData.get("dateOfBirth") || null,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  try {
    const before = await prisma.employee.findUnique({
      where: { id },
      select: { hourlyRate: true },
    });
    const oldRate = before ? Number(before.hourlyRate) : null;
    const newRate = parsed.data.hourlyRate;
    const rateChanged = oldRate !== null && oldRate !== newRate;

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        hourlyRate: newRate,
        dateOfBirth: parsed.data.dateOfBirth,
      },
    });

    const summary = rateChanged
      ? `Cập nhật thông tin ${updated.name} · lương ${formatVND(oldRate)} → ${formatVND(newRate)}`
      : `Cập nhật thông tin ${updated.name}`;
    const metadata: Record<string, unknown> = {};
    if (rateChanged) {
      metadata.field = "hourlyRate";
      metadata.oldRate = oldRate;
      metadata.newRate = newRate;
    }

    await logActivity({
      action: "employee.update",
      entityType: "employee",
      entityId: id,
      summary,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export type EmployeeTextField = "name" | "phone" | "email";

export async function updateEmployeeField(
  id: number,
  field: EmployeeTextField,
  rawValue: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  const trimmed = typeof rawValue === "string" ? rawValue.trim() : null;

  if (field === "name") {
    if (!trimmed || trimmed.length < 2) {
      return { ok: false, error: "Tên phải có ít nhất 2 ký tự" };
    }
  } else if (field === "email") {
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return { ok: false, error: "Email không hợp lệ" };
    }
  } else if (field === "phone") {
    if (trimmed && !/^[\d+\-\s]+$/.test(trimmed)) {
      return { ok: false, error: "Số điện thoại không hợp lệ" };
    }
  }

  const emp = await prisma.employee.findUnique({
    where: { id },
    select: { name: true, phone: true, email: true },
  });
  if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

  const newValue: string | null = field === "name" ? (trimmed as string) : trimmed || null;
  const oldValue = emp[field];
  if (oldValue === newValue) return { ok: true };

  try {
    await prisma.employee.update({
      where: { id },
      data: { [field]: newValue },
    });
    const fieldLabel: Record<EmployeeTextField, string> = {
      name: "tên",
      phone: "SĐT",
      email: "email",
    };
    await logActivity({
      action: "employee.update",
      entityType: "employee",
      entityId: id,
      summary: `Cập nhật ${fieldLabel[field]} ${emp.name}: ${oldValue ?? "—"} → ${newValue ?? "—"}`,
      metadata: { field, oldValue, newValue },
    });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function updateHourlyRate(
  id: number,
  newRate: number,
): Promise<{ ok: boolean; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  if (!Number.isFinite(newRate) || newRate < 0) {
    return { ok: false, error: "Lương phải >= 0" };
  }
  const emp = await prisma.employee.findUnique({
    where: { id },
    select: { name: true, hourlyRate: true },
  });
  if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };
  const oldRate = Number(emp.hourlyRate);
  if (oldRate === newRate) return { ok: true };
  await prisma.employee.update({
    where: { id },
    data: { hourlyRate: newRate },
  });
  await logActivity({
    action: "employee.update",
    entityType: "employee",
    entityId: id,
    summary: `Cập nhật lương ${emp.name}: ${formatVND(oldRate)} → ${formatVND(newRate)} /giờ`,
    metadata: { field: "hourlyRate", oldRate, newRate },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { ok: true };
}

export async function bulkDeleteEmployees(
  ids: number[],
): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, deleted: 0, error: "Chỉ admin được phép" };
  }
  const validIds = ids.filter((n) => Number.isInteger(n) && n > 0);
  if (validIds.length === 0) {
    return { ok: false, deleted: 0, error: "Không có nhân viên nào được chọn" };
  }
  if (validIds.length > 100) {
    return { ok: false, deleted: 0, error: "Tối đa 100 nhân viên mỗi lần" };
  }
  try {
    const emps = await prisma.employee.findMany({
      where: { id: { in: validIds } },
      select: { id: true, name: true },
    });
    const result = await prisma.employee.deleteMany({
      where: { id: { in: validIds } },
    });
    await logActivity({
      action: "employee.bulk_delete",
      entityType: "employee",
      summary: `Xoá ${result.count} nhân viên: ${emps.map((e) => e.name).slice(0, 5).join(", ")}${emps.length > 5 ? "..." : ""}`,
      metadata: { ids: validIds, count: result.count },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true, deleted: result.count };
  } catch (e) {
    return {
      ok: false,
      deleted: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

export type BulkRaiseMode = "percent" | "amount";

export async function bulkRaiseHourlyRate(
  ids: number[],
  mode: BulkRaiseMode,
  value: number,
): Promise<{
  ok: boolean;
  updated: number;
  error?: string;
  changes?: Array<{ id: number; name: string; oldRate: number; newRate: number }>;
}> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, updated: 0, error: "Chỉ admin được phép" };
  }
  const validIds = ids.filter((n) => Number.isInteger(n) && n > 0);
  if (validIds.length === 0) {
    return { ok: false, updated: 0, error: "Không có nhân viên nào được chọn" };
  }
  if (validIds.length > 100) {
    return { ok: false, updated: 0, error: "Tối đa 100 nhân viên mỗi lần" };
  }
  if (!Number.isFinite(value)) {
    return { ok: false, updated: 0, error: "Giá trị không hợp lệ" };
  }
  if (mode === "percent" && (value < -50 || value > 100)) {
    return { ok: false, updated: 0, error: "Phần trăm phải trong khoảng -50% đến +100%" };
  }
  if (mode === "amount" && (value < -1_000_000 || value > 1_000_000)) {
    return { ok: false, updated: 0, error: "Số tiền cộng/trừ phải trong khoảng ±1.000.000 VND" };
  }

  try {
    const emps = await prisma.employee.findMany({
      where: { id: { in: validIds } },
      select: { id: true, name: true, hourlyRate: true },
    });

    const changes: Array<{ id: number; name: string; oldRate: number; newRate: number }> =
      [];
    for (const e of emps) {
      const oldRate = Number(e.hourlyRate);
      const computed =
        mode === "percent" ? oldRate * (1 + value / 100) : oldRate + value;
      const newRate = Math.max(0, Math.round(computed)); // round to nearest VND
      if (newRate === oldRate) continue;
      changes.push({ id: e.id, name: e.name, oldRate, newRate });
    }

    if (changes.length === 0) {
      return { ok: true, updated: 0, changes: [] };
    }

    await prisma.$transaction(
      changes.map((c) =>
        prisma.employee.update({
          where: { id: c.id },
          data: { hourlyRate: c.newRate },
        }),
      ),
    );

    // One activity log per change so the salary-history widget picks them up
    await Promise.all(
      changes.map((c) =>
        logActivity({
          action: "employee.update",
          entityType: "employee",
          entityId: c.id,
          summary: `Tăng lương hàng loạt ${c.name}: ${formatVND(c.oldRate)} → ${formatVND(c.newRate)} /giờ`,
          metadata: { field: "hourlyRate", oldRate: c.oldRate, newRate: c.newRate, bulk: true },
        }),
      ),
    );

    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true, updated: changes.length, changes };
  } catch (e) {
    return {
      ok: false,
      updated: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

export async function duplicateEmployee(
  id: number,
): Promise<{ ok: boolean; newId?: number; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin được phép" };
  }
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "ID không hợp lệ" };
  }
  try {
    const original = await prisma.employee.findUnique({ where: { id } });
    if (!original) {
      return { ok: false, error: "Không tìm thấy nhân viên" };
    }
    const created = await prisma.employee.create({
      data: {
        name: `(bản sao) ${original.name}`,
        role: original.role,
        hourlyRate: Number(original.hourlyRate),
        dateOfBirth: original.dateOfBirth,
        email: null,
        phone: null,
        avatarUrl: null,
        pinHash: null,
      },
    });
    await logActivity({
      action: "employee.duplicate",
      entityType: "employee",
      entityId: created.id,
      summary: `Tạo bản sao của ${original.name} (id=${created.id})`,
      metadata: { sourceId: id, newId: created.id },
    });
    revalidatePath("/employees");
    return { ok: true, newId: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function bulkResetPin(
  ids: number[],
): Promise<{ ok: boolean; reset: number; error?: string }> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, reset: 0, error: "Chỉ admin được phép" };
  }
  const validIds = Array.from(
    new Set(ids.filter((n) => Number.isInteger(n) && n > 0)),
  );
  if (validIds.length === 0) {
    return { ok: false, reset: 0, error: "Không có nhân viên nào được chọn" };
  }
  if (validIds.length > 100) {
    return { ok: false, reset: 0, error: "Tối đa 100 nhân viên mỗi lần" };
  }
  try {
    const result = await prisma.employee.updateMany({
      where: { id: { in: validIds }, pinHash: { not: null } },
      data: { pinHash: null },
    });
    if (result.count > 0) {
      const emps = await prisma.employee.findMany({
        where: { id: { in: validIds } },
        select: { name: true },
      });
      await logActivity({
        action: "employee.bulk_reset_pin",
        entityType: "employee",
        summary: `Reset PIN cho ${result.count} nhân viên: ${emps
          .map((e) => e.name)
          .slice(0, 5)
          .join(", ")}${emps.length > 5 ? "…" : ""}`,
        metadata: { ids: validIds, count: result.count },
      });
    }
    revalidatePath("/employees");
    return { ok: true, reset: result.count };
  } catch (e) {
    return {
      ok: false,
      reset: 0,
      error: e instanceof Error ? e.message : "Lỗi không xác định",
    };
  }
}

export async function deleteEmployee(id: number) {
  const emp = await prisma.employee.findUnique({ where: { id }, select: { name: true } });
  await prisma.employee.delete({ where: { id } });
  await logActivity({
    action: "employee.delete",
    entityType: "employee",
    entityId: id,
    summary: `Xoá nhân viên ${emp?.name ?? `#${id}`}`,
  });
  revalidatePath("/employees");
  revalidatePath("/");
}

async function generateAndSaveAvatar(emp: { id: number; name: string; role: string }) {
  const prompt = avatarPromptFor({ name: emp.name, role: emp.role });
  const result = await generateImage(prompt);
  const res = await fetch(result.url);
  if (!res.ok) throw new Error(`Không tải được ảnh: ${res.status}`);
  const raw = Buffer.from(await res.arrayBuffer());

  // Resize + convert to WebP for smaller files and better quality
  const { default: sharp } = await import("sharp");
  const optimized = await sharp(raw)
    .resize(512, 512, { fit: "cover", position: "center" })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const filename = `emp-${emp.id}-${Date.now()}.webp`;
  const dir = path.join(process.cwd(), "public", "avatars");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), optimized);
  const publicUrl = `/avatars/${filename}`;
  await prisma.employee.update({
    where: { id: emp.id },
    data: { avatarUrl: publicUrl },
  });
  return publicUrl;
}

export async function uploadAvatarForEmployee(
  id: number,
  formData: FormData,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Vui lòng chọn ảnh" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Ảnh quá lớn (max 5MB)" };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File không phải ảnh" };
  }

  try {
    const raw = Buffer.from(await file.arrayBuffer());
    const { default: sharp } = await import("sharp");
    const optimized = await sharp(raw)
      .rotate() // respect EXIF orientation
      .resize(512, 512, { fit: "cover", position: "center" })
      .webp({ quality: 85, effort: 4 })
      .toBuffer();

    const filename = `emp-${id}-${Date.now()}.webp`;
    const dir = path.join(process.cwd(), "public", "avatars");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, filename), optimized);
    const publicUrl = `/avatars/${filename}`;

    await prisma.employee.update({
      where: { id },
      data: { avatarUrl: publicUrl },
    });
    await logActivity({
      action: "employee.avatar.upload",
      entityType: "employee",
      entityId: id,
      summary: `Upload ảnh cho ${emp.name}`,
    });
    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    revalidatePath("/");
    return { ok: true, url: publicUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi xử lý ảnh" };
  }
}

export async function generateAvatarForEmployee(id: number) {
  const emp = await prisma.employee.findUnique({ where: { id } });
  if (!emp) throw new Error("Không tìm thấy nhân viên");
  const url = await generateAndSaveAvatar(emp);
  await logActivity({
    action: "employee.avatar",
    entityType: "employee",
    entityId: id,
    summary: `Tạo avatar mới cho ${emp.name}`,
  });
  revalidatePath("/employees");
  revalidatePath("/");
  return url;
}

const VALID_ROLES = new Set(["barista", "server", "cashier", "manager"]);

export type ImportResult = {
  ok: boolean;
  imported?: number;
  errors?: Array<{ row: number; reason: string }>;
};

function parseCsv(text: string): string[][] {
  // Strip UTF-8 BOM
  const cleaned = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let cur: string[] = [];
  let val = "";
  let inQuotes = false;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inQuotes) {
      if (c === '"') {
        if (cleaned[i + 1] === '"') {
          val += '"';
          i++;
        } else inQuotes = false;
      } else val += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        cur.push(val);
        val = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && cleaned[i + 1] === "\n") i++;
        cur.push(val);
        rows.push(cur);
        cur = [];
        val = "";
      } else val += c;
    }
  }
  if (val.length > 0 || cur.length > 0) {
    cur.push(val);
    rows.push(cur);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export async function importEmployeesCsv(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: [{ row: 0, reason: "Vui lòng chọn file .csv" }] };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, errors: [{ row: 0, reason: "File quá lớn (max 2MB)" }] };
  }
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { ok: false, errors: [{ row: 0, reason: "File rỗng hoặc chỉ có header" }] };
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    name: header.indexOf("name"),
    role: header.indexOf("role"),
    phone: header.indexOf("phone"),
    email: header.indexOf("email"),
    rate: header.indexOf("hourly_rate"),
  };
  if (idx.name < 0 || idx.role < 0) {
    return {
      ok: false,
      errors: [{ row: 1, reason: "Header phải có cột 'name' và 'role'" }],
    };
  }

  const errors: Array<{ row: number; reason: string }> = [];
  const toCreate: Array<{
    name: string;
    role: "barista" | "server" | "cashier" | "manager";
    phone: string | null;
    email: string | null;
    hourlyRate: number;
  }> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = row[idx.name]?.trim() ?? "";
    const role = row[idx.role]?.trim().toLowerCase() ?? "";
    const phone = idx.phone >= 0 ? row[idx.phone]?.trim() || null : null;
    const email = idx.email >= 0 ? row[idx.email]?.trim() || null : null;
    const rateRaw = idx.rate >= 0 ? row[idx.rate]?.trim() : "";
    const rateNum = rateRaw ? Number(rateRaw.replace(/[,\s]/g, "")) : 30000;

    if (!name) {
      errors.push({ row: i + 1, reason: "Thiếu name" });
      continue;
    }
    if (!VALID_ROLES.has(role)) {
      errors.push({
        row: i + 1,
        reason: `Role không hợp lệ: '${role}' (chấp nhận: barista, server, cashier, manager)`,
      });
      continue;
    }
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      errors.push({ row: i + 1, reason: `Lương không hợp lệ: '${rateRaw}'` });
      continue;
    }
    toCreate.push({
      name,
      role: role as "barista" | "server" | "cashier" | "manager",
      phone,
      email,
      hourlyRate: rateNum,
    });
  }

  if (toCreate.length === 0) {
    return { ok: false, errors };
  }

  try {
    await prisma.employee.createMany({ data: toCreate });
    await logActivity({
      action: "employee.import",
      entityType: "employee",
      summary: `Import CSV: ${toCreate.length} nhân viên${errors.length ? `, ${errors.length} dòng lỗi` : ""}`,
      metadata: { imported: toCreate.length, errors: errors.length },
    });
    revalidatePath("/employees");
    revalidatePath("/");
    return { ok: true, imported: toCreate.length, errors };
  } catch (e) {
    return {
      ok: false,
      errors: [
        ...errors,
        {
          row: 0,
          reason: e instanceof Error ? e.message : "Lỗi không xác định",
        },
      ],
    };
  }
}

export async function generateAvatarsForAllMissing(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
}> {
  const missing = await prisma.employee.findMany({
    where: { avatarUrl: null },
    select: { id: true, name: true, role: true },
  });
  if (missing.length === 0) {
    return { total: 0, succeeded: 0, failed: 0 };
  }
  const results = await Promise.allSettled(
    missing.map((e) => generateAndSaveAvatar(e)),
  );
  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  await logActivity({
    action: "employee.avatar.batch",
    entityType: "employee",
    summary: `Tạo avatar hàng loạt: ${succeeded}/${missing.length} thành công`,
    metadata: { total: missing.length, succeeded },
  });
  revalidatePath("/employees");
  revalidatePath("/");
  return {
    total: missing.length,
    succeeded,
    failed: missing.length - succeeded,
  };
}
