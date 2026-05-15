"use server";

import { getSession } from "@/lib/auth";
import { generateHelpAnswer } from "@/lib/xai";

export type AskHelpState = {
  question: string;
  answer: string | null;
  error: string | null;
};

export const initialAskHelpState: AskHelpState = {
  question: "",
  answer: null,
  error: null,
};

export async function askHelpAction(
  _prevState: AskHelpState,
  formData: FormData,
): Promise<AskHelpState> {
  const sess = await getSession();
  if (!sess) {
    return {
      question: "",
      answer: null,
      error: "Bạn cần đăng nhập để dùng trợ lý.",
    };
  }

  const raw = formData.get("question");
  const question = typeof raw === "string" ? raw.trim() : "";

  if (question.length === 0) {
    return {
      question: "",
      answer: null,
      error: "Vui lòng nhập câu hỏi.",
    };
  }
  if (question.length > 500) {
    return {
      question,
      answer: null,
      error: "Câu hỏi quá dài (tối đa 500 ký tự).",
    };
  }

  try {
    const { content } = await generateHelpAnswer(question);
    return { question, answer: content, error: null };
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Không lấy được câu trả lời.";
    return { question, answer: null, error: message };
  }
}
