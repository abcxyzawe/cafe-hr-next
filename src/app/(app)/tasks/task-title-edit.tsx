"use client";

import { InlineTextEdit } from "@/app/(app)/employees/inline-text-edit";
import { cn } from "@/lib/utils";
import { updateTaskTitle } from "./actions";

const TITLE_VALIDATE = (v: string): string | null => {
  const trimmed = v.trim();
  if (trimmed.length < 1) return "Tiêu đề không được trống";
  if (trimmed.length > 120) return "Tiêu đề tối đa 120 ký tự";
  return null;
};

export function TaskTitleEdit({
  id,
  title,
  isDone,
}: {
  id: number;
  title: string;
  isDone: boolean;
}) {
  return (
    <InlineTextEdit
      value={title}
      editable
      validate={TITLE_VALIDATE}
      ariaLabel={`tiêu đề việc ${title}`}
      className={cn("font-medium", isDone && "line-through")}
      onSave={async (v) => updateTaskTitle(id, v ?? "")}
    />
  );
}
