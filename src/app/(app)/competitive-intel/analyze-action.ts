"use server";

import { getSession } from "@/lib/auth";
import { analyzeCompetitiveLandscape } from "@/lib/xai";
import {
  MAX_COMPETITORS,
  MIN_COMPETITORS,
  parseCompetitorsFromFormData,
  type CompetitiveState,
} from "./competitive-types";

export async function analyzeCompetitiveAction(
  prevState: CompetitiveState,
  formData: FormData,
): Promise<CompetitiveState> {
  const rawOwnName = formData.get("ownName");
  const rawOwnUsp = formData.get("ownUsp");

  const ownNameRaw = typeof rawOwnName === "string" ? rawOwnName : "";
  const ownUspRaw = typeof rawOwnUsp === "string" ? rawOwnUsp : "";
  const ownName = ownNameRaw.trim().replace(/\s+/g, " ");
  const ownUsp = ownUspRaw.trim().replace(/\s+/g, " ");

  const rawCompetitors = parseCompetitorsFromFormData(formData);
  const competitors = rawCompetitors.map((c) => ({
    name: c.name.trim().replace(/\s+/g, " "),
    notes: c.notes.trim().replace(/\s+/g, " "),
  }));

  const echoState: CompetitiveState = {
    ownName: ownNameRaw,
    ownUsp: ownUspRaw,
    competitors:
      rawCompetitors.length > 0
        ? rawCompetitors
        : prevState.competitors,
    result: null,
    error: null,
    generatedAt: null,
  };

  const sess = await getSession();
  if (!sess) {
    return {
      ...echoState,
      error: "Bạn cần đăng nhập để dùng tính năng này.",
    };
  }
  if (sess.role !== "admin") {
    return {
      ...echoState,
      error: "Chỉ quản trị viên mới có thể phân tích cạnh tranh.",
    };
  }

  if (ownName.length < 5 || ownName.length > 200) {
    return {
      ...echoState,
      error: "Tên quán phải dài 5-200 ký tự.",
    };
  }
  if (ownUsp.length < 5 || ownUsp.length > 200) {
    return {
      ...echoState,
      error: "USP phải dài 5-200 ký tự.",
    };
  }

  if (
    competitors.length < MIN_COMPETITORS ||
    competitors.length > MAX_COMPETITORS
  ) {
    return {
      ...echoState,
      error: `Cần ${MIN_COMPETITORS}-${MAX_COMPETITORS} đối thủ để phân tích.`,
    };
  }

  for (let i = 0; i < competitors.length; i += 1) {
    const c = competitors[i];
    if (!c) continue;
    if (c.name.length < 5 || c.name.length > 200) {
      return {
        ...echoState,
        error: `Tên đối thủ #${i + 1} phải dài 5-200 ký tự.`,
      };
    }
    if (c.notes.length < 5 || c.notes.length > 200) {
      return {
        ...echoState,
        error: `Định vị đối thủ #${i + 1} phải dài 5-200 ký tự.`,
      };
    }
  }

  try {
    const result = await analyzeCompetitiveLandscape({
      ownName,
      ownUsp,
      competitors,
    });
    return {
      ownName: ownNameRaw,
      ownUsp: ownUspRaw,
      competitors: rawCompetitors,
      result,
      error: null,
      generatedAt: Date.now(),
    };
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Không phân tích được cạnh tranh. Vui lòng thử lại.";
    return { ...echoState, error: message };
  }
}
