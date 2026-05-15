"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { PIN_MARKER } from "./notes-constants";

const noteSchema = z.object({
  content: z.string().min(1, "Ghi chú không được trống").max(2000, "Ghi chú quá dài"),
});

export type NoteState = { ok: boolean; error?: string };
export type TogglePinState =
  | { ok: true; pinned: boolean }
  | { ok: false; error: string };

export async function createNote(
  employeeId: number,
  _prev: NoteState,
  formData: FormData,
): Promise<NoteState> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  const parsed = noteSchema.safeParse({
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  try {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true },
    });
    if (!emp) return { ok: false, error: "Không tìm thấy nhân viên" };

    await prisma.employeeNote.create({
      data: {
        employeeId,
        authorId: sess.uid,
        authorName: sess.name,
        content: parsed.data.content,
      },
    });
    await logActivity({
      action: "employee.note.create",
      entityType: "employee",
      entityId: employeeId,
      summary: `Thêm ghi chú cho ${emp.name}`,
    });
    revalidatePath(`/employees/${employeeId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function updateNote(
  noteId: number,
  newContent: string,
): Promise<NoteState> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  const parsed = noteSchema.safeParse({ content: newContent });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
    };
  }

  const note = await prisma.employeeNote.findUnique({
    where: { id: noteId },
    select: { id: true, employeeId: true, authorId: true, content: true },
  });
  if (!note) return { ok: false, error: "Không tìm thấy ghi chú" };

  if (sess.role !== "admin" && sess.uid !== note.authorId) {
    return { ok: false, error: "Không có quyền sửa ghi chú này" };
  }

  // Preserve the pin marker across edits. The client strips the marker for
  // display, so re-apply it if the original was pinned and the new content
  // doesn't already start with it.
  const wasPinned = note.content.startsWith(PIN_MARKER);
  const incoming = parsed.data.content;
  const nextContent =
    wasPinned && !incoming.startsWith(PIN_MARKER) ? PIN_MARKER + incoming : incoming;

  if (note.content === nextContent) {
    return { ok: true };
  }

  try {
    await prisma.employeeNote.update({
      where: { id: noteId },
      data: { content: nextContent },
    });
    await logActivity({
      action: "employee.note.update",
      entityType: "employee",
      entityId: note.employeeId,
      summary: `Sửa ghi chú #${noteId}`,
    });
    revalidatePath(`/employees/${note.employeeId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function toggleNotePin(noteId: number): Promise<TogglePinState> {
  const sess = await getSession();
  if (!sess) return { ok: false, error: "Chưa đăng nhập" };

  const note = await prisma.employeeNote.findUnique({
    where: { id: noteId },
    select: { id: true, employeeId: true, authorId: true, content: true },
  });
  if (!note) return { ok: false, error: "Không tìm thấy ghi chú" };

  if (sess.role !== "admin" && sess.uid !== note.authorId) {
    return { ok: false, error: "Không có quyền ghim ghi chú này" };
  }

  const isPinned = note.content.startsWith(PIN_MARKER);
  const nextContent = isPinned
    ? note.content.slice(PIN_MARKER.length)
    : PIN_MARKER + note.content;
  const nowPinned = !isPinned;

  try {
    await prisma.employeeNote.update({
      where: { id: noteId },
      data: { content: nextContent },
    });
    await logActivity({
      action: nowPinned ? "employee.note.pin" : "employee.note.unpin",
      entityType: "employee",
      entityId: note.employeeId,
      summary: `${nowPinned ? "Ghim" : "Bỏ ghim"} ghi chú #${noteId}`,
    });
    revalidatePath(`/employees/${note.employeeId}`);
    return { ok: true, pinned: nowPinned };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" };
  }
}

export async function deleteNote(noteId: number) {
  const sess = await getSession();
  if (!sess) throw new Error("Chưa đăng nhập");

  const note = await prisma.employeeNote.findUnique({
    where: { id: noteId },
    select: { id: true, employeeId: true, authorId: true },
  });
  if (!note) throw new Error("Không tìm thấy ghi chú");

  // Only the author or an admin can delete
  if (sess.role !== "admin" && sess.uid !== note.authorId) {
    throw new Error("Không có quyền xoá ghi chú này");
  }

  await prisma.employeeNote.delete({ where: { id: noteId } });
  await logActivity({
    action: "employee.note.delete",
    entityType: "employee",
    entityId: note.employeeId,
    summary: `Xoá ghi chú #${noteId}`,
  });
  revalidatePath(`/employees/${note.employeeId}`);
}
