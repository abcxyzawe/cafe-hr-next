import "server-only";

import type { FeedbackFacts } from "@/lib/feedback-compiler-data";

const IMAGE_ENDPOINT = "https://api.x.ai/v1/images/generations";

export type ImageGenResult = {
  url: string;
  mimeType?: string;
};

export async function generateImage(prompt: string): Promise<ImageGenResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Image service is not configured");
  const model = process.env.XAI_IMAGE_MODEL || "grok-imagine-image";

  const res = await fetch(IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      response_format: "url",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Image API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    data?: Array<{ url?: string; mime_type?: string }>;
  };
  const item = data.data?.[0];
  if (!item?.url) throw new Error("No image URL in response");
  return { url: item.url, mimeType: item.mime_type };
}

const CHAT_ENDPOINT = "https://api.x.ai/v1/chat/completions";

/**
 * Generate a short coffee-shop themed daily motivation quote in Vietnamese.
 */
export async function generateDailyQuote(): Promise<{
  content: string;
  model: string;
}> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Quote service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là người viết câu nói truyền cảm hứng cho một quán cà phê Việt Nam. Trả lời ngắn gọn, ấm áp, hài hước nhẹ, không sến.",
    },
    {
      role: "user",
      content:
        "Viết 1 câu truyền cảm hứng ngắn (tối đa 25 từ) cho nhân viên quán cà phê đọc vào đầu ngày làm việc. Chỉ trả về câu nói, không giải thích, không quote mark.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.9,
      max_tokens: 120,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quote API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  content = content.replace(/^["'""]|["'""]$/g, "").trim();
  return { content, model };
}

/**
 * Generate a 2-3 sentence Vietnamese daily briefing based on operational facts.
 * Returns plain text — no markdown, no bullets.
 */
export async function generateBriefing(facts: {
  pendingLeaves: number;
  openAttendance: number;
  overdueTasks: number;
  birthdaysToday: number;
  shiftsToday: number;
  unfilledShiftSlots: number;
}): Promise<{ content: string; model: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Briefing service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const factsJson = JSON.stringify(facts);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý quán cà phê Việt Nam, ấm áp, chuyên nghiệp và súc tích. Luôn trả lời bằng tiếng Việt tự nhiên, không markdown, không gạch đầu dòng, không emoji.",
    },
    {
      role: "user",
      content:
        `Dưới đây là các con số tình hình quán hôm nay (JSON):\n${factsJson}\n\n` +
        "Hãy viết một đoạn tóm tắt việc cần làm hôm nay, 2-3 câu, dưới 50 từ. " +
        "Tập trung vào việc ưu tiên cần xử lý (đơn nghỉ chờ duyệt, ca trống, công việc quá hạn, sinh nhật) " +
        "và đưa lời nhắc ngắn gọn cho quản lý. Không markdown, không bullet, không trích dẫn.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 220,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Briefing API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  content = content.replace(/^["'""]|["'""]$/g, "").trim();
  return { content, model };
}

export async function generateKudosSuggestions(args: {
  employeeName: string;
  role: string;
  emoji: string;
}): Promise<string[]> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Kudos AI service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const employeeName = args.employeeName.trim() || "đồng nghiệp";
  const role = args.role.trim() || "nhân viên";
  const emoji = args.emoji.trim() || "👏";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là một đồng nghiệp thân thiện làm việc tại quán cà phê Việt Nam. Giọng văn ấm áp, gần gũi, chân thành, không sến, không khoa trương. Chỉ trả về JSON hợp lệ theo cấu trúc được yêu cầu.",
    },
    {
      role: "user",
      content: `Hãy viết đúng 3 lời khen ngắn (mỗi câu tối đa 20 từ) bằng tiếng Việt dành cho ${employeeName} với vai trò "${role}". Lời khen phải cụ thể, phù hợp với công việc của vai trò đó, và ăn nhập với biểu tượng cảm xúc ${emoji}. Trả về JSON đúng dạng: {"messages": ["câu 1", "câu 2", "câu 3"]}. Không thêm giải thích, không markdown, không dấu ngoặc kép thừa quanh câu.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 400,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Kudos suggest API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");

  const parsed = parseKudosArray(content);
  const cleaned = parsed
    .map((s) => s.trim().replace(/^["'""]|["'""]$/g, "").trim())
    .filter((s) => s.length > 0)
    .slice(0, 3);
  if (cleaned.length === 0) throw new Error("Không trích xuất được lời khen");
  return cleaned;
}

function parseKudosArray(content: string): string[] {
  try {
    const obj = JSON.parse(content) as unknown;
    const arr = extractMessagesArray(obj);
    if (arr) return arr;
  } catch {
    // fall through
  }
  const arrMatch = content.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]) as unknown;
      if (Array.isArray(arr)) {
        return arr.filter((x): x is string => typeof x === "string");
      }
    } catch {
      // fall through
    }
  }
  return content
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[\s\-*\d.)]+/, "").trim())
    .filter((line) => line.length > 0);
}

function extractMessagesArray(obj: unknown): string[] | null {
  if (Array.isArray(obj)) {
    return (obj as unknown[]).filter((x): x is string => typeof x === "string");
  }
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  const candidates: unknown[] = [rec.messages, rec.kudos, rec.suggestions, rec.data];
  for (const cand of candidates) {
    if (Array.isArray(cand)) {
      return cand.filter((x): x is string => typeof x === "string");
    }
  }
  return null;
}

/**
 * Answer a help question about the Cafe HR app. Grounded by a system prompt
 * describing feature areas and route map so the model doesn't invent screens.
 */
export async function generateHelpAnswer(
  question: string,
): Promise<{ content: string; model: string }> {
  const trimmed = question.trim();
  if (trimmed.length === 0) {
    throw new Error("Vui lòng nhập câu hỏi.");
  }
  if (trimmed.length > 500) {
    throw new Error("Câu hỏi quá dài (tối đa 500 ký tự).");
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Trợ lý chưa được cấu hình (XAI_API_KEY).");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const systemPrompt =
    "Bạn là trợ lý hệ thống ấm áp, gần gũi của ứng dụng \"Cafe HR\" — phần mềm quản lý nhân sự cho quán cà phê Việt Nam. " +
    "Nhiệm vụ: hướng dẫn người dùng cách sử dụng app dựa CHỈ vào các chức năng có thật dưới đây. " +
    "Tuyệt đối không bịa ra trang/menu/nút không có trong danh sách.\n\n" +
    "## Các nhóm chức năng\n" +
    "- Nhân viên: thêm/sửa/xoá hồ sơ, import CSV/Excel, tăng lương hàng loạt, đặt PIN, ghi chú có @nhắc tên.\n" +
    "- Ca làm: xếp lịch tuần/tháng, copy tuần, template lịch, đổi ca giữa 2 nhân viên, sửa giờ inline.\n" +
    "- Chấm công: check-in/out, sửa giờ, cảnh báo trùng đơn nghỉ.\n" +
    "- Bảng lương: tự tính = giờ làm × hourlyRate, xuất Excel theo tháng, in phiếu lương A4.\n" +
    "- Báo cáo: charts, heatmap, top nhân viên, xuất Excel.\n" +
    "- Nghỉ phép: tạo đơn, duyệt/từ chối, lịch 7 ngày tới.\n" +
    "- Công việc (Tasks): tạo task có tag, deadline, đánh dấu hoàn thành.\n" +
    "- Cài đặt giao diện: 4 chế độ sáng/tối, 6 bảng màu, 2 mức density, bật/tắt 17 widget dashboard.\n" +
    "- Audit log: nhật ký toàn bộ thao tác, filter, search highlight, dọn dẹp theo khoảng thời gian.\n" +
    "- Kiosk check-in: tablet quán dùng PIN bcrypt để chấm công nhanh.\n" +
    "- PWA: cài đặt được như app, hoạt động offline ở Kiosk.\n" +
    "- Backup: xuất XLSX 7 sheet (NV, ca, chấm công, đơn nghỉ, lương, công việc, hoạt động).\n" +
    "- Generate avatar bằng AI: tự sinh ảnh đại diện trong trang chi tiết nhân viên.\n\n" +
    "## Bản đồ route\n" +
    "/employees, /shifts, /attendance, /payroll, /leave, /reports, /tasks, /audit, /settings, /me, /kiosk.\n\n" +
    "## Quy tắc trả lời\n" +
    "1) Tiếng Việt tự nhiên, ấm áp, súc tích — 50 đến 120 từ.\n" +
    "2) KHÔNG dùng markdown (không **, không #, không ```), KHÔNG bullet, KHÔNG emoji.\n" +
    "3) Nếu cần liệt kê các bước, viết liền mạch trong câu (vd: \"vào /employees, bấm Thêm, điền thông tin…\").\n" +
    "4) Nếu câu hỏi nằm ngoài phạm vi app, nói thẳng \"Mình chỉ hỗ trợ về Cafe HR\" rồi gợi ý hướng đi liên quan.\n" +
    "5) Không bịa tên nút/screen không có trong danh sách trên.";

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: trimmed },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 500,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Help API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được câu trả lời.");
  return { content, model };
}

/**
 * Generate today's "Drink of the Day" suggestion in Vietnamese.
 * Returns the drink name, a short Vietnamese tagline (≤ 12 words),
 * and a SHORT English image prompt basis (≤ 12 words) used to feed
 * the image generator.
 */
export async function generateDrinkOfTheDay(seed?: string): Promise<{
  name: string;
  tagline: string;
  imagePromptBasis: string;
}> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Drink AI service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const seedHint = seed
    ? `Hôm nay là ${seed}. Hãy chọn một món hợp với cảm hứng của ngày này (mùa, thời tiết Việt Nam, dịp đặc biệt nếu có).`
    : "Hãy chọn một món sáng tạo nhưng thực tế.";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là barista quán cà phê Việt Nam giàu kinh nghiệm. Nhiệm vụ: gợi ý đúng MỘT món đồ uống cho \"Đồ uống hôm nay\". " +
        "Các loại có thể chọn: espresso, cold brew, cappuccino, latte, các biến thể trà sữa, hoặc đồ uống theo mùa hợp với khẩu vị Việt. " +
        "Tên món bằng tiếng Việt (có thể giữ một vài từ tiếng Anh phổ biến như Latte, Cold Brew). " +
        "Tagline tối đa 12 từ, ấm áp, gợi cảm giác. " +
        "imagePromptBasis viết bằng TIẾNG ANH, tối đa 12 từ, mô tả ngắn để tạo ảnh (nguyên liệu/màu sắc/loại ly). " +
        "CHỈ trả về JSON đúng dạng: {\"name\":\"...\",\"tagline\":\"...\",\"imagePromptBasis\":\"...\"}. Không markdown, không giải thích.",
    },
    {
      role: "user",
      content: `${seedHint} Trả về JSON {"name","tagline","imagePromptBasis"} đúng yêu cầu hệ thống.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 250,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drink API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty drink response");
  const parsed = parseDrinkPayload(content);
  if (!parsed) throw new Error("Không trích xuất được thông tin đồ uống");
  return parsed;
}

function parseDrinkPayload(
  content: string,
): { name: string; tagline: string; imagePromptBasis: string } | null {
  const tryShape = (obj: unknown):
    | { name: string; tagline: string; imagePromptBasis: string }
    | null => {
    if (!obj || typeof obj !== "object") return null;
    const rec = obj as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const tagline = typeof rec.tagline === "string" ? rec.tagline.trim() : "";
    const imagePromptBasis =
      typeof rec.imagePromptBasis === "string"
        ? rec.imagePromptBasis.trim()
        : typeof rec.image_prompt_basis === "string"
          ? (rec.image_prompt_basis as string).trim()
          : "";
    if (!name || !tagline || !imagePromptBasis) return null;
    return { name, tagline, imagePromptBasis };
  };
  try {
    const obj = JSON.parse(content) as unknown;
    const direct = tryShape(obj);
    if (direct) return direct;
  } catch {
    // fall through
  }
  const objMatch = content.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]) as unknown;
      const found = tryShape(obj);
      if (found) return found;
    } catch {
      // fall through
    }
  }
  // Last-ditch: parse "name: ..." style lines
  const get = (label: RegExp): string => {
    const m = content.match(label);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  const name = get(/name["']?\s*[:=]\s*["']?([^"'\n]+)/i);
  const tagline = get(/tagline["']?\s*[:=]\s*["']?([^"'\n]+)/i);
  const basis = get(/image[_ ]?prompt[_ ]?basis["']?\s*[:=]\s*["']?([^"'\n]+)/i);
  if (name && tagline && basis) {
    return { name, tagline, imagePromptBasis: basis };
  }
  return null;
}

/**
 * Generate a themed image for the daily drink using the existing image endpoint.
 * Wraps the short English prompt basis into a consistent style template.
 */
export async function generateDrinkImage(
  promptBasis: string,
): Promise<{ url: string }> {
  const safeBasis = promptBasis.trim().replace(/\s+/g, " ").slice(0, 120);
  const prompt =
    `Stylized close-up of ${safeBasis}, on a marble cafe counter, ` +
    `soft window light, warm flat-vector illustration, no text, square 1:1`;
  const result = await generateImage(prompt);
  return { url: result.url };
}

/**
 * Generate a warm, short Vietnamese birthday wish for a cafe colleague.
 * Returns plain text — no markdown, no wrapping quotes.
 */
export async function generateBirthdayWish(args: {
  name: string;
  role: string;
  turningAge: number;
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Birthday wish service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const name = args.name.trim() || "đồng nghiệp";
  const role = args.role.trim() || "nhân viên";
  const ageHint =
    Number.isFinite(args.turningAge) && args.turningAge > 0
      ? `bước sang tuổi ${args.turningAge}`
      : "thêm một tuổi mới";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là một đồng nghiệp Việt Nam thân thiện làm việc tại quán cà phê. " +
        "Giọng văn ấm áp, chân thành, gần gũi, có chút vui tươi nhưng không sến. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, không markdown, không emoji, không dấu ngoặc kép.",
    },
    {
      role: "user",
      content:
        `Hãy viết đúng MỘT lời chúc mừng sinh nhật ngắn (tối đa 30 từ) bằng tiếng Việt cho ${name} — vai trò "${role}", ${ageHint}. ` +
        "Lời chúc cần nhắc đến tên và vai trò một cách tự nhiên, ấm áp, hợp với không khí quán cà phê. " +
        "Chỉ trả về đúng câu chúc, không lời dẫn, không giải thích, không dấu ngoặc kép, không emoji.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.9,
      max_tokens: 200,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Birthday wish API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty birthday wish response");
  // Strip wrapping quotes (straight + curly)
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate a celebratory cafe-themed birthday illustration.
 * Reuses the existing image endpoint via generateImage().
 */
export async function generateBirthdayImage(
  name: string,
): Promise<{ url: string }> {
  // name is intentionally unused inside the prompt to keep the illustration
  // text-free and people-free; we keep the param so callers can vary cache keys later.
  void name;
  const prompt =
    "Cheerful birthday illustration: a Vietnamese cafe scene with a small frosted cake topped with a single lit candle, " +
    "soft confetti, warm cream and amber colors, warm flat-vector illustration style, no text, no people, square 1:1";
  const result = await generateImage(prompt);
  return { url: result.url };
}

/**
 * Generate a short Vietnamese announcement for the entire cafe team.
 * Returns plain text — no markdown, no wrapping quotes.
 */
export async function generateAnnouncement(args: {
  topic: string;
  tone: "friendly" | "formal" | "urgent";
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Announcement service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const topic = args.topic.trim();
  if (topic.length === 0) throw new Error("Vui lòng nhập chủ đề thông báo");
  if (topic.length > 300) throw new Error("Chủ đề quá dài (tối đa 300 ký tự)");

  const toneGuides: Record<typeof args.tone, string> = {
    friendly:
      "Giọng văn ấm áp, gần gũi, có chút hài hước nhẹ nhưng không sến. " +
      "Tạo cảm giác đồng đội thân thiết.",
    formal:
      "Giọng văn trang trọng, chuyên nghiệp, súc tích. " +
      "Tránh từ lóng, không bông đùa.",
    urgent:
      "Giọng văn rõ ràng, gấp gáp, đi thẳng vào vấn đề. " +
      'Mở đầu bằng "Quan trọng:" nếu phù hợp với nội dung.',
  };

  const temperatureByTone: Record<typeof args.tone, number> = {
    friendly: 0.85,
    formal: 0.5,
    urgent: 0.4,
  };

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý quán cà phê Việt Nam, đang soạn thông báo nội bộ gửi tới toàn bộ nhân viên (barista, phục vụ, thu ngân). " +
        toneGuides[args.tone] +
        " Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #), KHÔNG bullet, KHÔNG emoji, KHÔNG dấu ngoặc kép quanh câu.",
    },
    {
      role: "user",
      content:
        `Hãy viết thông báo nội bộ về chủ đề: "${topic}". ` +
        "Đối tượng nhận: toàn bộ đội ngũ nhân viên quán. " +
        "Yêu cầu: TỐI ĐA 60 từ, viết liền mạch một đoạn, không markdown, không bullet, không trích dẫn. " +
        "Chỉ trả về đúng nội dung thông báo, không lời dẫn, không giải thích.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperatureByTone[args.tone],
      max_tokens: 300,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Announcement API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung thông báo");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate a Vietnamese performance review draft (~80-120 words) for an
 * employee based on real metrics. Returns plain text with 2-3 paragraphs,
 * no markdown, no wrapping quotes.
 */
export async function generatePerformanceReview(args: {
  employeeName: string;
  role: string;
  period: "week" | "month";
  tone: "balanced" | "encouraging" | "critical";
  metrics: {
    hours: number;
    daysWorked: number;
    reliabilityPct: number;
    kudosCount: number;
    lateCount: number;
  };
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Performance review service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const name = args.employeeName.trim() || "đồng nghiệp";
  const role = args.role.trim() || "nhân viên";
  const periodLabel = args.period === "week" ? "tuần" : "tháng";

  const toneGuides: Record<typeof args.tone, string> = {
    balanced:
      "Giọng văn cân bằng, khách quan: nêu rõ điểm mạnh đáng ghi nhận và " +
      "điểm cần cải thiện một cách công tâm. Không thiên về khen hay chê.",
    encouraging:
      "Giọng văn ấm áp, động viên, nhấn mạnh các điểm tích cực và tiến bộ. " +
      "Nếu có điểm cần cải thiện, gợi ý nhẹ nhàng, mang tính khuyến khích.",
    critical:
      "Giọng văn thẳng thắn nhưng vẫn tôn trọng. Chỉ rõ vấn đề cụ thể " +
      "(trễ giờ, thiếu chuyên cần, v.v.) và đề xuất hành động cải thiện cụ thể, " +
      "tránh đánh giá cá nhân hay xúc phạm.",
  };

  const temperatureByTone: Record<typeof args.tone, number> = {
    balanced: 0.55,
    encouraging: 0.85,
    critical: 0.35,
  };

  const metricsJson = JSON.stringify(args.metrics);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý nhân sự (HR) ấm áp, chuyên nghiệp của một quán cà phê Việt Nam. " +
        "Nhiệm vụ: viết bản nháp đánh giá hiệu suất ngắn cho nhân viên dựa CHỈ vào các chỉ số được cung cấp. " +
        toneGuides[args.tone] +
        " Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #), KHÔNG bullet, KHÔNG emoji, " +
        "KHÔNG dấu ngoặc kép quanh đoạn văn. Không bịa số liệu ngoài JSON đã cho.",
    },
    {
      role: "user",
      content:
        `Hãy viết bản đánh giá hiệu suất ${periodLabel} cho ${name} (vai trò "${role}"). ` +
        `Các chỉ số trong kỳ (JSON):\n${metricsJson}\n\n` +
        "Trong đó: hours = tổng giờ làm, daysWorked = số ngày có chấm công, " +
        "reliabilityPct = tỉ lệ đi làm đúng theo lịch (%), kudosCount = số lời khen nhận được, " +
        "lateCount = số lần trễ giờ. " +
        "Yêu cầu: viết khoảng 80-120 từ, chia 2-3 đoạn, tiếng Việt tự nhiên, không markdown, " +
        "không bullet, không trích dẫn. Bắt đầu bằng tên nhân viên, kết thúc bằng một câu " +
        "định hướng cho kỳ tới. Chỉ trả về đúng nội dung đánh giá.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: temperatureByTone[args.tone],
      max_tokens: 500,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Perf review API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung đánh giá");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate 1-2 brief practical brewing tips (≤ 50 words total) in Vietnamese
 * for a specific drink recipe. Returns plain text — no markdown.
 */
export async function generateBrewingTip(
  recipeName: string,
  recipeContext?: string,
): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Brewing tip service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const name = recipeName.trim() || "đồ uống";
  const context = recipeContext?.trim();

  const messages = [
    {
      role: "system",
      content:
        "Bạn là một head barista người Việt với hơn 10 năm kinh nghiệm pha chế tại các quán cà phê đặc sản. " +
        "Giọng văn ấm áp, gần gũi, đi thẳng vào kỹ thuật. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #), KHÔNG bullet, KHÔNG emoji, KHÔNG dấu ngoặc kép.",
    },
    {
      role: "user",
      content:
        `Hãy chia sẻ 1-2 mẹo pha chế thực dụng và cụ thể cho món "${name}". ` +
        (context ? `Bối cảnh công thức: ${context}. ` : "") +
        "Yêu cầu: TỐI ĐA 50 từ tổng cộng, viết liền mạch một đoạn ngắn, không markdown, không bullet, không lời dẫn. " +
        "Tập trung vào kỹ thuật cụ thể (nhiệt độ, thời gian, lực tay, tỉ lệ) — tránh nói chung chung.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 200,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brewing tip API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được mẹo pha chế");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate a Vietnamese job posting (~150 words) for a cafe role.
 * Returns plain text — no markdown, 4 sections (intro, "Bạn sẽ làm:",
 * "Mong đợi:", "Quyền lợi:") and a closing contact line.
 */
export async function generateJobPosting(args: {
  role: string;
  shifts: string[];
  perk: string;
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Job posting service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const roleMap: Record<string, string> = {
    barista: "Pha chế",
    server: "Phục vụ",
    cashier: "Thu ngân",
    manager: "Quản lý",
  };
  const shiftMap: Record<string, string> = {
    morning: "Sáng",
    afternoon: "Chiều",
    evening: "Tối",
  };

  const roleLabel = roleMap[args.role] ?? args.role;
  const shiftLabels = args.shifts
    .map((s) => shiftMap[s] ?? s)
    .filter((s) => s.length > 0);
  const shiftsText =
    shiftLabels.length > 0 ? shiftLabels.join(", ") : "Linh hoạt";
  const perk = args.perk.trim() || "Môi trường thân thiện";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên viên nhân sự (HR) ấm áp, gần gũi của một quán cà phê Việt Nam, chuyên viết tin tuyển dụng hấp dẫn. " +
        "Giọng văn thân thiện, chân thành, gợi cảm hứng nhưng không sến, không khoa trương. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #, không ```), " +
        "KHÔNG bullet, KHÔNG emoji, KHÔNG dấu ngoặc kép quanh đoạn văn. " +
        "Trình bày bằng các đoạn văn ngắn, mỗi đoạn của mục bắt đầu bằng tiêu đề có dấu hai chấm (vd: \"Bạn sẽ làm:\").",
    },
    {
      role: "user",
      content:
        `Hãy viết một tin tuyển dụng hoàn chỉnh cho vị trí "${roleLabel}" tại quán cà phê. ` +
        `Ca làm việc có thể chọn: ${shiftsText}. ` +
        `Quyền lợi nổi bật cần nhấn mạnh: "${perk}". ` +
        "Yêu cầu: tổng độ dài khoảng 150 từ, gồm đúng 4 phần theo thứ tự: " +
        "(1) Đoạn mở đầu giới thiệu vai trò và không khí quán (2-3 câu, không có tiêu đề); " +
        "(2) đoạn \"Bạn sẽ làm:\" liệt kê 3-4 đầu việc chính viết liền mạch trong câu, ngăn cách bằng dấu phẩy hoặc chấm phẩy; " +
        "(3) đoạn \"Mong đợi:\" nêu 2-3 yêu cầu/tố chất; " +
        "(4) đoạn \"Quyền lợi:\" nhấn mạnh perk đã cho cùng 1-2 quyền lợi liên quan. " +
        "Kết thúc bằng một câu CTA mời ứng tuyển kèm cách liên hệ chung " +
        "(vd: \"Ứng tuyển ngay qua email tuyendung@quanca.phe hoặc nhắn tin trực tiếp cho quán.\"). " +
        "KHÔNG markdown, KHÔNG bullet, KHÔNG emoji. Chỉ trả về đúng nội dung tin tuyển dụng.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.75,
      max_tokens: 600,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Job posting API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung tin tuyển dụng");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate a 3-section daily standup briefing in Vietnamese based on
 * operational facts. Returns plain text — no markdown, 3 short paragraphs
 * separated by blank lines, each starting with "Hôm qua:", "Hôm nay:",
 * "Cần chú ý:".
 */
export async function generateStandup(facts: {
  yesterday: object;
  today: object;
  alerts: object;
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Standup service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const factsJson = JSON.stringify(facts);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý vận hành quán cà phê Việt Nam, ấm áp và súc tích. " +
        "Nhiệm vụ: viết bản briefing họp đầu ca cho cả đội dựa CHỈ vào các con số được cung cấp. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #, không ```), " +
        "KHÔNG bullet, KHÔNG emoji, KHÔNG dấu ngoặc kép quanh đoạn văn. " +
        "Không bịa số liệu ngoài JSON đã cho.",
    },
    {
      role: "user",
      content:
        `Dưới đây là 3 nhóm số liệu vận hành (JSON):\n${factsJson}\n\n` +
        "Trong đó: yesterday = tình hình hôm qua (checkins = số nhân viên đã chấm công, " +
        "tasksCompleted = task hoàn thành, leavesProcessed = đơn nghỉ đã xử lý); " +
        "today = kế hoạch hôm nay (shiftsScheduled = ca đã xếp, pendingTasks = task chưa xong, " +
        "upcomingLeaves = số đơn nghỉ sắp tới); " +
        "alerts = cần chú ý (overdueTasks = task quá hạn, pendingLeaves = đơn nghỉ chờ duyệt, " +
        "openAttendance = quên check-out từ hôm qua). " +
        "Yêu cầu: viết tổng cộng 100-150 từ, chia đúng 3 đoạn ngắn ngăn cách bằng một dòng trống. " +
        "Đoạn 1 bắt đầu bằng \"Hôm qua:\" — tóm tắt việc đã diễn ra. " +
        "Đoạn 2 bắt đầu bằng \"Hôm nay:\" — kế hoạch ưu tiên trong ngày. " +
        "Đoạn 3 bắt đầu bằng \"Cần chú ý:\" — các điểm cần xử lý ngay. " +
        "KHÔNG markdown, KHÔNG bullet, KHÔNG trích dẫn. Chỉ trả về đúng nội dung briefing.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 400,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Standup API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung briefing");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate a Vietnamese narrative summary (~100-150 words, 2-3 paragraphs)
 * of recent audit log activity based on aggregated facts. Returns plain text —
 * no markdown, no wrapping quotes.
 */
export async function generateAuditSummary(facts: {
  dayCount: number;
  totalEvents: number;
  byAction: Record<string, number>;
  topUsers: Array<{ name: string; count: number }>;
  samples: string[];
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Audit summary service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const factsJson = JSON.stringify(facts);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý vận hành quán cà phê Việt Nam, ấm áp, có kinh nghiệm và quan sát tốt. " +
        "Giọng văn dựa trên sự thật, mang tính quan sát và hữu ích — không phán xét, không phóng đại. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #, không ```), " +
        "KHÔNG bullet, KHÔNG emoji, KHÔNG dấu ngoặc kép quanh đoạn văn. " +
        "Không bịa số liệu ngoài JSON đã cho.",
    },
    {
      role: "user",
      content:
        `Dưới đây là các chỉ số nhật ký hoạt động trong ${facts.dayCount} ngày gần nhất (JSON):\n${factsJson}\n\n` +
        "Trong đó: dayCount = số ngày tổng hợp, totalEvents = tổng số sự kiện, " +
        "byAction = số lần theo loại hành động (vd: employee.create, attendance.checkin), " +
        "topUsers = các thành viên hoạt động nhiều nhất, " +
        "samples = một số mô tả thực tế làm bối cảnh tham khảo. " +
        "Hãy viết tóm tắt khoảng 100-150 từ bằng tiếng Việt, chia 2-3 đoạn ngăn cách bằng một dòng trống. " +
        "Tập trung vào các mô hình hoạt động (loại thao tác nào diễn ra nhiều, ai hoạt động sôi nổi) " +
        "và những việc đáng chú ý. Kết thúc bằng đúng MỘT câu nhận xét hoặc đề xuất ngắn cho quản lý. " +
        "KHÔNG markdown, KHÔNG bullet, KHÔNG trích dẫn. Chỉ trả về đúng nội dung tóm tắt.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 400,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Audit summary API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung tóm tắt");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate a 5-question Vietnamese multiple-choice quiz about cafe knowledge
 * (SOPs and/or recipes). Strict JSON validation: exactly 5 questions, each
 * with exactly 4 non-empty choices, an answerIndex in 0-3, and a non-empty
 * explanation.
 */
export type QuizQuestion = {
  q: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
};

export async function generateQuiz(args: {
  topic: "sop" | "recipes" | "mixed";
  context: string;
}): Promise<{ questions: QuizQuestion[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Quiz service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const topicLabel: Record<typeof args.topic, string> = {
    sop: "quy trình vận hành quán (SOP)",
    recipes: "công thức pha chế đồ uống",
    mixed: "tổng hợp quy trình SOP và công thức pha chế",
  };

  const safeContext = args.context.trim().slice(0, 6000);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là huấn luyện viên giàu kinh nghiệm cho nhân viên quán cà phê Việt Nam. " +
        "Nhiệm vụ: soạn bài kiểm tra trắc nghiệm tiếng Việt dựa CHỈ vào nội dung được cung cấp. " +
        "Câu hỏi rõ ràng, đáp án chính xác, lựa chọn đánh lừa hợp lý nhưng không mơ hồ. " +
        "CHỈ trả về JSON hợp lệ đúng cấu trúc đã yêu cầu, không markdown, không lời dẫn.",
    },
    {
      role: "user",
      content:
        `Chủ đề: ${topicLabel[args.topic]}.\n\n` +
        `Nội dung tham khảo:\n${safeContext}\n\n` +
        "Hãy soạn ĐÚNG 5 câu hỏi trắc nghiệm tiếng Việt. " +
        "Mỗi câu có ĐÚNG 4 lựa chọn (choices), CHỈ MỘT đáp án đúng (answerIndex từ 0 đến 3), " +
        "kèm giải thích ngắn (explanation, 1-2 câu) lý giải vì sao đáp án đó đúng. " +
        "Trả về JSON đúng dạng: " +
        '{"questions":[{"q":"...","choices":["...","...","...","..."],"answerIndex":0,"explanation":"..."}, ...]}. ' +
        "Không thêm trường khác, không markdown, không trích dẫn quanh câu.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quiz API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty quiz response");

  const questions = parseQuizPayload(content);
  return { questions };
}

function parseQuizPayload(content: string): QuizQuestion[] {
  const tryParse = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  let parsed: unknown = tryParse(content);
  if (parsed === null) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi quiz không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawQuestions = root.questions;
  if (!Array.isArray(rawQuestions)) {
    throw new Error("Phản hồi quiz thiếu mảng 'questions'");
  }
  if (rawQuestions.length !== 5) {
    throw new Error(`Cần đúng 5 câu hỏi, nhận được ${rawQuestions.length}`);
  }

  const result: QuizQuestion[] = rawQuestions.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Câu ${idx + 1} không hợp lệ`);
    }
    const rec = item as Record<string, unknown>;
    const q = typeof rec.q === "string" ? rec.q.trim() : "";
    if (!q) throw new Error(`Câu ${idx + 1} thiếu nội dung 'q'`);

    const choicesRaw = rec.choices;
    if (!Array.isArray(choicesRaw) || choicesRaw.length !== 4) {
      throw new Error(`Câu ${idx + 1} cần đúng 4 lựa chọn`);
    }
    const choices: string[] = choicesRaw.map((c, ci) => {
      if (typeof c !== "string" || c.trim().length === 0) {
        throw new Error(`Câu ${idx + 1}, lựa chọn ${ci + 1} không hợp lệ`);
      }
      return c.trim();
    });

    const ansRaw = rec.answerIndex;
    const answerIndex =
      typeof ansRaw === "number"
        ? ansRaw
        : typeof ansRaw === "string"
          ? Number.parseInt(ansRaw, 10)
          : Number.NaN;
    if (
      !Number.isInteger(answerIndex) ||
      answerIndex < 0 ||
      answerIndex > 3
    ) {
      throw new Error(`Câu ${idx + 1} có answerIndex ngoài 0-3`);
    }

    const explanation =
      typeof rec.explanation === "string" ? rec.explanation.trim() : "";
    if (!explanation) {
      throw new Error(`Câu ${idx + 1} thiếu giải thích`);
    }

    return { q, choices, answerIndex, explanation };
  });

  return result;
}

/**
 * Generate a Vietnamese weekly recap (~150-200 words, 3 paragraphs) for a cafe.
 * The three paragraphs are themed: Tổng quan / Điểm sáng / Cần lưu ý.
 * Returns plain text — no markdown.
 */
export async function generateWeeklyInsights(facts: {
  weekRange: string;
  totalHours: number;
  totalShifts: number;
  attendanceRate: number;
  kudosCount: number;
  leavesProcessed: number;
  topPerformers: Array<{ name: string; hours: number }>;
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Weekly insights service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const factsJson = JSON.stringify(facts);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý vận hành quán cà phê Việt Nam, vừa thân thiện vừa biết phân tích số liệu. " +
        "Nhiệm vụ: viết bản tóm tắt tuần dựa CHỈ vào các con số được cung cấp, không bịa số liệu khác. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #, không ```), " +
        "KHÔNG bullet, KHÔNG emoji, KHÔNG dấu ngoặc kép quanh đoạn văn.",
    },
    {
      role: "user",
      content:
        `Dưới đây là các con số vận hành tuần ${facts.weekRange} (JSON):\n${factsJson}\n\n` +
        "Trong đó: weekRange = khoảng thời gian tuần, totalHours = tổng giờ làm, " +
        "totalShifts = tổng số ca xếp, attendanceRate = tỉ lệ đi làm đúng theo lịch (%), " +
        "kudosCount = số lời khen đã trao, leavesProcessed = số đơn nghỉ đã xử lý, " +
        "topPerformers = top nhân viên theo giờ làm. " +
        "Hãy viết tổng cộng 150-200 từ, chia ĐÚNG 3 đoạn ngắn ngăn cách bằng một dòng trống. " +
        "Đoạn 1 bắt đầu bằng \"Tổng quan:\" — tóm tắt khối lượng vận hành chung của tuần. " +
        "Đoạn 2 bắt đầu bằng \"Điểm sáng:\" — nêu top performer và các con số tích cực (kudos, attendance cao). " +
        "Đoạn 3 bắt đầu bằng \"Cần lưu ý:\" — chỉ ra điểm cần theo dõi (attendance thấp, đơn nghỉ tồn, ca trống). " +
        "KHÔNG markdown, KHÔNG bullet, KHÔNG trích dẫn. Chỉ trả về đúng nội dung tóm tắt.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: 600,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Weekly insights API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung tóm tắt tuần");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

/**
 * Generate a Vietnamese onboarding/training script (~250 words) for a new
 * cafe hire. Returns plain text — no markdown — with three labeled sections:
 * "Mục tiêu:", "Lịch trình:" (day-by-day for multi-day plans) and "Đánh giá:".
 */
export async function generateTrainingScript(args: {
  role: string;
  experience: "novice" | "experienced";
  duration: "1day" | "3day" | "1week";
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Training script service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const roleMap: Record<string, string> = {
    barista: "Pha chế",
    server: "Phục vụ",
    cashier: "Thu ngân",
    manager: "Quản lý",
  };
  const experienceMap: Record<typeof args.experience, string> = {
    novice: "mới vào nghề (chưa có kinh nghiệm)",
    experienced: "đã có kinh nghiệm làm việc tại quán cà phê",
  };
  const durationMap: Record<typeof args.duration, string> = {
    "1day": "1 ngày",
    "3day": "3 ngày",
    "1week": "1 tuần (7 ngày)",
  };
  const dayCountMap: Record<typeof args.duration, number> = {
    "1day": 1,
    "3day": 3,
    "1week": 7,
  };

  const roleLabel = roleMap[args.role] ?? args.role;
  const experienceLabel = experienceMap[args.experience];
  const durationLabel = durationMap[args.duration];
  const dayCount = dayCountMap[args.duration];

  const scheduleHint =
    dayCount === 1
      ? "Trong phần Lịch trình, chia theo các khung giờ trong ngày (sáng, trưa, chiều) thay vì theo ngày."
      : `Trong phần Lịch trình, chia rõ theo từng ngày từ "Ngày 1:" đến "Ngày ${dayCount}:", mỗi ngày 1-2 câu nêu trọng tâm và hoạt động chính.`;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là huấn luyện viên giàu kinh nghiệm tại một quán cà phê Việt Nam, " +
        "chuyên thiết kế lộ trình đào tạo cho nhân viên mới. " +
        "Giọng văn ấm áp, rõ ràng, thực tế, đi vào cụ thể từng đầu việc. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, KHÔNG markdown (không **, không #, không ```), " +
        "KHÔNG bullet, KHÔNG emoji, KHÔNG dấu ngoặc kép quanh đoạn văn.",
    },
    {
      role: "user",
      content:
        `Hãy soạn lộ trình đào tạo cho nhân viên mới ở vị trí "${roleLabel}", ` +
        `${experienceLabel}, với thời lượng ${durationLabel}. ` +
        "Yêu cầu: tổng độ dài khoảng 250 từ, chia ĐÚNG 3 phần ngăn cách bằng một dòng trống, " +
        "mỗi phần bắt đầu bằng tiêu đề có dấu hai chấm đặt ở đầu dòng. " +
        "Phần 1 bắt đầu bằng \"Mục tiêu:\" — nêu 2-3 mục tiêu cốt lõi mà nhân viên cần đạt được sau khoá đào tạo. " +
        `Phần 2 bắt đầu bằng \"Lịch trình:\" — ${scheduleHint} ` +
        "Phần 3 bắt đầu bằng \"Đánh giá:\" — mô tả ngắn cách kiểm tra/đánh giá kết quả " +
        "(quan sát thực hành, kiểm tra kiến thức, phản hồi từ trưởng ca…). " +
        "Điều chỉnh độ sâu kiến thức theo mức kinh nghiệm đã cho. " +
        "KHÔNG markdown, KHÔNG bullet, KHÔNG trích dẫn. Chỉ trả về đúng nội dung lộ trình.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Training script API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung lộ trình đào tạo");
  content = content.replace(/^["'""']+|["'""']+$/g, "").trim();
  return { content };
}

export function avatarPromptFor(opts: {
  name: string;
  role: string;
}): string {
  const roleMap: Record<string, string> = {
    barista: "barista pha chế cà phê",
    server: "phục vụ bưng đồ uống",
    cashier: "thu ngân quầy thanh toán",
    manager: "quản lý quán",
  };
  const roleVi = roleMap[opts.role] || opts.role;
  return `Stylized friendly portrait illustration of a Vietnamese cafe ${roleVi} named ${opts.name}, soft smile, warm cafe ambient lighting, flat vector design with subtle shading, neutral cream background, square 1:1 head-and-shoulders composition, professional yet approachable, no text`;
}

/**
 * Translate a list of Vietnamese cafe menu items into English with a short
 * 1-line description (intended for tourists / English-speaking customers).
 * Returns an array in the SAME order/length as the input. Each entry has
 * the original Vietnamese line, the English translation, and a description.
 */
export type MenuTranslation = {
  vi: string;
  en: string;
  description: string;
};

export async function translateMenu(
  items: string[],
): Promise<{ translations: MenuTranslation[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Menu translator service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const cleaned = items
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
  if (cleaned.length === 0) {
    throw new Error("Danh sách món rỗng");
  }

  const numbered = cleaned.map((s, i) => `${i + 1}. ${s}`).join("\n");

  const messages = [
    {
      role: "system",
      content:
        "You are a knowledgeable bilingual Vietnamese-English cafe menu translator. " +
        "You understand Vietnamese cafe culture, regional variations (Bắc/Trung/Nam), " +
        "and common drink/food items. Capture cultural nuance so English-speaking " +
        "tourists understand what the dish actually is — not just a literal word-for-word translation. " +
        "If a line includes a price (vd: \"Cà phê sữa đá - 35,000\"), keep the item name only " +
        "in the `vi` field (you may include the price as-is) and translate just the dish name in `en`. " +
        "Descriptions should be 1 short English sentence (≤ 18 words), helpful and appetizing, " +
        "mentioning key ingredients or preparation. " +
        "ONLY return valid JSON in the exact structure requested. No markdown, no commentary.",
    },
    {
      role: "user",
      content:
        `Translate the following Vietnamese cafe menu items into English. ` +
        `There are EXACTLY ${cleaned.length} items. Preserve their order.\n\n` +
        `${numbered}\n\n` +
        `Return JSON in this exact shape:\n` +
        `{"translations":[{"vi":"<original line>","en":"<English name>","description":"<1-line English description>"}, ...]}\n` +
        `The "translations" array MUST contain exactly ${cleaned.length} entries, in the same order as above. ` +
        `Every field must be a non-empty string. No extra fields, no markdown, no trailing commas.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Menu translator API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty menu translation response");

  const translations = parseMenuTranslationPayload(content, cleaned);
  return { translations };
}

function parseMenuTranslationPayload(
  content: string,
  inputs: string[],
): MenuTranslation[] {
  const tryParse = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  let parsed: unknown = tryParse(content);
  if (parsed === null) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi dịch menu không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.translations;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi dịch menu thiếu mảng 'translations'");
  }
  if (rawList.length !== inputs.length) {
    throw new Error(
      `Cần đúng ${inputs.length} mục dịch, nhận được ${rawList.length}`,
    );
  }

  return rawList.map((item, idx): MenuTranslation => {
    if (!item || typeof item !== "object") {
      throw new Error(`Mục ${idx + 1} không hợp lệ`);
    }
    const rec = item as Record<string, unknown>;
    const vi = typeof rec.vi === "string" ? rec.vi.trim() : "";
    const en = typeof rec.en === "string" ? rec.en.trim() : "";
    const description =
      typeof rec.description === "string" ? rec.description.trim() : "";
    if (!vi) throw new Error(`Mục ${idx + 1} thiếu 'vi'`);
    if (!en) throw new Error(`Mục ${idx + 1} thiếu 'en'`);
    if (!description) throw new Error(`Mục ${idx + 1} thiếu 'description'`);
    return { vi, en, description };
  });
}

// ---------------------------------------------------------------------------
// Marketing copy generator (slogan + social caption + Facebook ad)
// ---------------------------------------------------------------------------

export type MarketingTone = "playful" | "premium" | "youthful";

export type MarketingCopy = {
  slogan: string;
  caption: string;
  ad: string;
};

const MARKETING_TONE_LABEL: Record<MarketingTone, string> = {
  playful: "Vui vẻ",
  premium: "Sang trọng",
  youthful: "Trẻ trung",
};

function stripWrappingQuotes(s: string): string {
  return s.replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, "").trim();
}

export async function generateMarketingCopy(args: {
  topic: string;
  tone: MarketingTone;
  offer: string;
}): Promise<MarketingCopy> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Marketing service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const topic = args.topic.trim();
  const offer = args.offer.trim();
  if (!topic) throw new Error("Thiếu chủ đề chiến dịch");
  if (!offer) throw new Error("Thiếu ưu đãi hoặc điểm nổi bật");
  const toneLabel = MARKETING_TONE_LABEL[args.tone];
  if (!toneLabel) throw new Error("Tông giọng không hợp lệ");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là copywriter marketing chuyên nghiệp cho các quán cà phê Việt Nam. " +
        "Bạn viết bằng tiếng Việt tự nhiên, giàu cảm xúc, đúng văn phong người trẻ Việt, " +
        "biết dùng emoji vừa phải và hashtag hiệu quả cho mạng xã hội. " +
        "Luôn bám sát chủ đề chiến dịch, tông giọng được yêu cầu và ưu đãi cụ thể. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy viết bộ nội dung marketing cho quán cà phê với:\n` +
        `- Chủ đề chiến dịch: ${topic}\n` +
        `- Tông giọng: ${toneLabel}\n` +
        `- Ưu đãi / điểm nổi bật: ${offer}\n\n` +
        `Trả về JSON đúng cấu trúc sau:\n` +
        `{"slogan":"<slogan ngắn gọn ≤ 12 từ, không dấu chấm cuối, không dấu ngoặc kép>",` +
        `"caption":"<caption mạng xã hội ≤ 60 từ, có thể chèn 1-3 hashtag #abc ở cuối>",` +
        `"ad":"<bài quảng cáo Facebook ≤ 100 từ, mở đầu hấp dẫn, có lời kêu gọi hành động (CTA) rõ ràng>"}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Tất cả 3 trường đều bắt buộc, không được rỗng.\n` +
        `- Không kèm dấu ngoặc kép bao quanh nội dung.\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Marketing API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi marketing rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi marketing không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi marketing không phải JSON hợp lệ");
  }

  const rec = parsed as Record<string, unknown>;
  const slogan =
    typeof rec.slogan === "string" ? stripWrappingQuotes(rec.slogan) : "";
  const caption =
    typeof rec.caption === "string" ? stripWrappingQuotes(rec.caption) : "";
  const ad = typeof rec.ad === "string" ? stripWrappingQuotes(rec.ad) : "";

  if (!slogan) throw new Error("Thiếu slogan trong phản hồi");
  if (!caption) throw new Error("Thiếu caption trong phản hồi");
  if (!ad) throw new Error("Thiếu nội dung quảng cáo trong phản hồi");

  if (slogan.length > 100) {
    throw new Error(`Slogan quá dài (${slogan.length}/100 ký tự)`);
  }
  if (caption.length > 500) {
    throw new Error(`Caption quá dài (${caption.length}/500 ký tự)`);
  }
  if (ad.length > 800) {
    throw new Error(`Quảng cáo quá dài (${ad.length}/800 ký tự)`);
  }

  return { slogan, caption, ad };
}

// ---------------------------------------------------------------------------
// Seasonal menu ideas generator
// ---------------------------------------------------------------------------

export type MenuIdeaSeason = "spring" | "summer" | "autumn" | "winter";
export type MenuIdeaFlavor =
  | "coffee"
  | "milk"
  | "fruit"
  | "tea"
  | "creative";

export type MenuIdea = {
  name: string;
  description: string;
  ingredients: string[];
  estimatedCostVnd: number;
};

const MENU_IDEA_SEASON_LABEL: Record<MenuIdeaSeason, string> = {
  spring: "mùa Xuân",
  summer: "mùa Hạ",
  autumn: "mùa Thu",
  winter: "mùa Đông",
};

const MENU_IDEA_FLAVOR_LABEL: Record<MenuIdeaFlavor, string> = {
  coffee: "Cà phê đậm",
  milk: "Sữa nhẹ",
  fruit: "Trái cây",
  tea: "Trà",
  creative: "Sáng tạo",
};

export async function generateMenuIdeas(args: {
  season: MenuIdeaSeason;
  flavor: MenuIdeaFlavor;
}): Promise<{ ideas: MenuIdea[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Menu ideas service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const seasonLabel = MENU_IDEA_SEASON_LABEL[args.season];
  const flavorLabel = MENU_IDEA_FLAVOR_LABEL[args.flavor];
  if (!seasonLabel) throw new Error("Mùa không hợp lệ");
  if (!flavorLabel) throw new Error("Hương vị không hợp lệ");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia sáng tạo menu cho quán cà phê Việt Nam. " +
        "Bạn am hiểu nguyên liệu Việt Nam, xu hướng đồ uống hiện đại, " +
        "và biết cân đối giá thành sao cho phù hợp với thị trường quán cà phê tầm trung. " +
        "Tên món ngắn gọn, hấp dẫn, có thể kết hợp tiếng Việt và tiếng Anh. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy đề xuất 5 ý tưởng đồ uống mới cho quán cà phê Việt Nam với:\n` +
        `- Mùa: ${seasonLabel}\n` +
        `- Phong cách hương vị: ${flavorLabel}\n\n` +
        `Trả về JSON đúng cấu trúc sau:\n` +
        `{"ideas":[{"name":"<tên món ngắn gọn>","description":"<mô tả ngắn ≤ 200 ký tự>",` +
        `"ingredients":["<nguyên liệu 1>","<nguyên liệu 2>", ...],` +
        `"estimatedCostVnd":<số nguyên dương, giá thành ước tính bằng VND>}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "ideas" phải có ĐÚNG 5 phần tử.\n` +
        `- Mỗi món có 3-6 nguyên liệu (mỗi nguyên liệu là chuỗi không rỗng).\n` +
        `- "estimatedCostVnd" là số nguyên dương (VND), hợp lý cho quán cà phê (15.000 - 80.000).\n` +
        `- "name" và "description" không được rỗng. "description" ≤ 200 ký tự.\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Menu ideas API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi ý tưởng menu rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi ý tưởng menu không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi ý tưởng menu không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.ideas;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi ý tưởng menu thiếu mảng 'ideas'");
  }
  if (rawList.length !== 5) {
    throw new Error(`Cần đúng 5 ý tưởng, nhận được ${rawList.length}`);
  }

  const ideas: MenuIdea[] = rawList.map((item, idx): MenuIdea => {
    if (!item || typeof item !== "object") {
      throw new Error(`Ý tưởng ${idx + 1} không hợp lệ`);
    }
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const description =
      typeof rec.description === "string" ? rec.description.trim() : "";
    if (!name) throw new Error(`Ý tưởng ${idx + 1} thiếu 'name'`);
    if (!description) throw new Error(`Ý tưởng ${idx + 1} thiếu 'description'`);
    if (description.length > 200) {
      throw new Error(
        `Mô tả ý tưởng ${idx + 1} quá dài (${description.length}/200 ký tự)`,
      );
    }

    const rawIngredients = rec.ingredients;
    if (!Array.isArray(rawIngredients)) {
      throw new Error(`Ý tưởng ${idx + 1} thiếu mảng 'ingredients'`);
    }
    const ingredients = rawIngredients
      .map((s): string => (typeof s === "string" ? s.trim() : ""))
      .filter((s) => s.length > 0);
    if (ingredients.length < 3 || ingredients.length > 6) {
      throw new Error(
        `Ý tưởng ${idx + 1} cần 3-6 nguyên liệu (nhận được ${ingredients.length})`,
      );
    }

    const rawCost = rec.estimatedCostVnd;
    const cost =
      typeof rawCost === "number"
        ? rawCost
        : typeof rawCost === "string"
          ? Number(rawCost)
          : NaN;
    if (!Number.isFinite(cost) || !Number.isInteger(cost) || cost <= 0) {
      throw new Error(
        `Ý tưởng ${idx + 1} có 'estimatedCostVnd' không hợp lệ`,
      );
    }

    return { name, description, ingredients, estimatedCostVnd: cost };
  });

  return { ideas };
}

export type SentimentLabel = "tích cực" | "trung tính" | "tiêu cực";

export type SentimentAnalysis = {
  score: number;
  label: SentimentLabel;
  themes: string[];
  suggestion: string;
};

const SENTIMENT_LABELS: ReadonlyArray<SentimentLabel> = [
  "tích cực",
  "trung tính",
  "tiêu cực",
];

function isSentimentLabel(v: unknown): v is SentimentLabel {
  return typeof v === "string" && SENTIMENT_LABELS.includes(v as SentimentLabel);
}

/**
 * Analyze sentiment of a feedback text (typically from a Vietnamese cafe
 * customer or staff member). Returns a normalized score, label, three
 * themes and one actionable suggestion — all in Vietnamese.
 */
export async function analyzeSentiment(
  text: string,
): Promise<SentimentAnalysis> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Sentiment service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Phản hồi không được rỗng");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia phân tích cảm xúc song ngữ (Việt-Anh) với hiểu biết sâu về bối cảnh quán cà phê Việt Nam: thói quen khách hàng, văn hoá phục vụ, đồ uống phổ biến (cà phê sữa đá, bạc xỉu, trà sữa...), không gian quán, ca làm việc của nhân viên. Luôn trả lời bằng JSON hợp lệ, không markdown, không bình luận thêm.",
    },
    {
      role: "user",
      content:
        `Phân tích cảm xúc của phản hồi sau (định dạng JSON): ${JSON.stringify({ feedback: trimmed })}\n\n` +
        `Trả về CHÍNH XÁC cấu trúc JSON sau:\n` +
        `{"score": <số thực trong [-1, 1] với 2 chữ số thập phân>, ` +
        `"label": "<tích cực|trung tính|tiêu cực>", ` +
        `"themes": ["<chủ đề 1>", "<chủ đề 2>", "<chủ đề 3>"], ` +
        `"suggestion": "<1 câu hành động cụ thể bằng tiếng Việt>"}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "score": số thực trong [-1, 1], LÀM TRÒN 2 chữ số thập phân.\n` +
        `- "label" phải khớp với score: > 0.3 → "tích cực", < -0.3 → "tiêu cực", còn lại → "trung tính".\n` +
        `- "themes": ĐÚNG 3 cụm từ ngắn tiếng Việt (mỗi cụm ≤ 30 ký tự, không rỗng), nêu các chủ đề chính trong phản hồi.\n` +
        `- "suggestion": 1 câu hành động cụ thể bằng tiếng Việt cho quản lý quán (≤ 200 ký tự, không rỗng).\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sentiment API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi phân tích cảm xúc rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi phân tích cảm xúc không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi phân tích cảm xúc không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;

  const rawScore = root.score;
  const scoreNum =
    typeof rawScore === "number"
      ? rawScore
      : typeof rawScore === "string"
        ? Number(rawScore)
        : NaN;
  if (!Number.isFinite(scoreNum) || scoreNum < -1 || scoreNum > 1) {
    throw new Error("Trường 'score' không hợp lệ (cần số trong [-1, 1])");
  }
  const score = Math.round(scoreNum * 100) / 100;

  const rawLabel = root.label;
  if (!isSentimentLabel(rawLabel)) {
    throw new Error("Trường 'label' không hợp lệ");
  }

  // Enforce label/score consistency on the server side.
  const expectedLabel: SentimentLabel =
    score > 0.3 ? "tích cực" : score < -0.3 ? "tiêu cực" : "trung tính";
  const label = expectedLabel;
  // (rawLabel kept above for validation; we trust score-derived label.)
  void rawLabel;

  const rawThemes = root.themes;
  if (!Array.isArray(rawThemes) || rawThemes.length !== 3) {
    throw new Error("Trường 'themes' cần đúng 3 phần tử");
  }
  const themes: string[] = rawThemes.map((t, idx): string => {
    const s = typeof t === "string" ? t.trim() : "";
    if (!s) throw new Error(`Chủ đề ${idx + 1} rỗng`);
    if (s.length > 30) {
      throw new Error(`Chủ đề ${idx + 1} quá dài (${s.length}/30 ký tự)`);
    }
    return s;
  });

  const rawSuggestion = root.suggestion;
  const suggestion =
    typeof rawSuggestion === "string" ? rawSuggestion.trim() : "";
  if (!suggestion) throw new Error("Trường 'suggestion' rỗng");
  if (suggestion.length > 200) {
    throw new Error(
      `Đề xuất quá dài (${suggestion.length}/200 ký tự)`,
    );
  }

  return { score, label, themes, suggestion };
}

export type CafeNameSuggestion = {
  name: string;
  tagline: string;
  rationale: string;
};

const CAFE_NAME_VIBE_LABEL: Readonly<Record<string, string>> = {
  cozy: "ấm cúng",
  modern: "hiện đại",
  luxe: "sang trọng",
  youth: "trẻ trung",
};

const CAFE_NAME_STYLE_LABEL: Readonly<Record<string, string>> = {
  vietnamese: "tiếng Việt",
  english: "tiếng Anh",
  mix: "tiếng Anh kèm phụ đề Việt",
};

/**
 * Generate 8 unique cafe name + tagline pairs from a vibe, language style
 * and optional keyword hints. Returns Vietnamese rationale for each pick.
 */
export async function generateCafeNames(args: {
  vibe: string;
  style: string;
  hints: string[];
}): Promise<{ names: CafeNameSuggestion[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Cafe name service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const vibeLabel = CAFE_NAME_VIBE_LABEL[args.vibe];
  const styleLabel = CAFE_NAME_STYLE_LABEL[args.style];
  if (!vibeLabel) throw new Error("Vibe không hợp lệ");
  if (!styleLabel) throw new Error("Style không hợp lệ");

  const cleanHints = args.hints
    .map((h) => h.trim())
    .filter((h) => h.length > 0)
    .slice(0, 3);

  const hintsBlock =
    cleanHints.length > 0
      ? `Từ khoá gợi ý từ chủ quán:\n` +
        cleanHints.map((h) => `- ${h}`).join("\n") +
        `\n\n`
      : `Không có từ khoá cụ thể — bạn được tự do sáng tạo theo vibe và phong cách.\n\n`;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia tư vấn đặt tên thương hiệu song ngữ Việt-Anh, " +
        "chuyên về quán cà phê và F&B tại Việt Nam. Bạn am hiểu văn hoá " +
        "quán cà phê Việt, xu hướng đặt tên hiện đại, cách kết hợp âm điệu " +
        "tiếng Việt và tiếng Anh sao cho dễ đọc, dễ nhớ, gợi cảm xúc và " +
        "khác biệt. Mỗi cái tên cần ngắn gọn, có cá tính riêng. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích " +
        "ngoài cấu trúc, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy gợi ý 8 cái tên quán cà phê độc đáo cùng tagline cho dự án sau:\n` +
        `- Vibe (không khí mong muốn): ${vibeLabel}\n` +
        `- Phong cách ngôn ngữ: ${styleLabel}\n\n` +
        hintsBlock +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"names":[{"name":"<tên quán>","tagline":"<slogan ngắn>",` +
        `"rationale":"<lý do chọn, tiếng Việt>"}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "names" phải có ĐÚNG 8 phần tử, KHÔNG TRÙNG tên.\n` +
        `- "name": 2-30 ký tự, không rỗng.\n` +
        `- "tagline": 5-60 ký tự, gợi cảm xúc.\n` +
        `- "rationale": 10-120 ký tự, giải thích súc tích bằng tiếng Việt.\n` +
        `- Tuân thủ phong cách ngôn ngữ đã yêu cầu (${styleLabel}).\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.95,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cafe name API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi tên quán rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi tên quán không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi tên quán không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.names;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi tên quán thiếu mảng 'names'");
  }
  if (rawList.length !== 8) {
    throw new Error(`Cần đúng 8 cái tên, nhận được ${rawList.length}`);
  }

  const seen = new Set<string>();
  const names: CafeNameSuggestion[] = rawList.map(
    (item, idx): CafeNameSuggestion => {
      if (!item || typeof item !== "object") {
        throw new Error(`Mục ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;
      const name = typeof rec.name === "string" ? rec.name.trim() : "";
      const tagline =
        typeof rec.tagline === "string" ? rec.tagline.trim() : "";
      const rationale =
        typeof rec.rationale === "string" ? rec.rationale.trim() : "";

      if (name.length < 2 || name.length > 30) {
        throw new Error(
          `Mục ${idx + 1} có 'name' dài ${name.length} ký tự (cần 2-30)`,
        );
      }
      if (tagline.length < 5 || tagline.length > 60) {
        throw new Error(
          `Mục ${idx + 1} có 'tagline' dài ${tagline.length} ký tự (cần 5-60)`,
        );
      }
      if (rationale.length < 10 || rationale.length > 120) {
        throw new Error(
          `Mục ${idx + 1} có 'rationale' dài ${rationale.length} ký tự (cần 10-120)`,
        );
      }

      const key = name.toLowerCase();
      if (seen.has(key)) {
        throw new Error(`Tên quán trùng: "${name}"`);
      }
      seen.add(key);

      return { name, tagline, rationale };
    },
  );

  return { names };
}

export type EmailReplyTone = "professional" | "friendly" | "apologetic";

/**
 * Generate a Vietnamese customer-service email reply (~100-150 words) in a chosen tone.
 * Returns plain text — greeting, body addressing the original, closing + sign-off "Đội Cafe HR".
 */
export async function generateEmailReply(args: {
  original: string;
  tone: EmailReplyTone;
  customerName?: string;
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Email reply service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const original = args.original.trim();
  const customerName = (args.customerName ?? "").trim();

  const toneInstruction =
    args.tone === "professional"
      ? "Giọng văn TRANG TRỌNG, lịch sự, cấu trúc rõ ràng, dùng kính ngữ phù hợp."
      : args.tone === "friendly"
        ? "Giọng văn THÂN THIỆN, ấm áp, gần gũi, vẫn tôn trọng khách hàng."
        : "Giọng văn CHÂN THÀNH XIN LỖI, thừa nhận vấn đề, đề xuất giải pháp cụ thể.";

  const greetingHint = customerName
    ? `Bắt đầu bằng lời chào có tên khách (ví dụ: "Kính gửi anh/chị ${customerName}," hoặc "Chào ${customerName},").`
    : `Bắt đầu bằng lời chào lịch sự không tên (ví dụ: "Kính gửi Quý khách," hoặc "Chào bạn,").`;

  const payload = {
    customerName: customerName || null,
    tone: args.tone,
    originalMessage: original,
  };

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên viên chăm sóc khách hàng song ngữ Việt-Anh cho một quán cà phê tại Việt Nam. Bạn viết phản hồi email ấm áp, lịch thiệp, đúng văn phong dịch vụ Việt Nam. Luôn trả lời bằng tiếng Việt tự nhiên, không markdown, không emoji, không trích dẫn lại nguyên văn email khách.",
    },
    {
      role: "user",
      content:
        `Dưới đây là yêu cầu viết phản hồi (JSON):\n${JSON.stringify(payload)}\n\n` +
        `Hãy viết MỘT email phản hồi bằng tiếng Việt, độ dài khoảng 100-150 từ. ${toneInstruction} ` +
        `${greetingHint} ` +
        "Phần thân: trả lời trực tiếp những điểm khách nêu trong originalMessage, ngắn gọn, rõ ràng, có ích. " +
        'Kết thúc bằng câu cảm ơn lịch sự và ký tên đúng dòng cuối là "Đội Cafe HR". ' +
        "Chỉ trả về nội dung email (không kèm tiêu đề Subject, không markdown, không bullet, không dấu ngoặc kép bao quanh toàn bộ).",
    },
  ];

  const temperature = args.tone === "friendly" ? 0.75 : 0.55;

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 600,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email reply API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  // Strip wrapping quotes (straight or curly) if the whole reply is wrapped.
  content = content.replace(/^["'“”‘’]+/, "").replace(/["'“”‘’]+$/, "").trim();
  return { content };
}

// =============================================================================
// Weekly menu planner (7-day rotating special menu)
// =============================================================================

export type WeeklyMenuDay = {
  weekday: string;
  name: string;
  description: string;
};

const WEEKLY_MENU_WEEKDAYS: ReadonlyArray<string> = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

const WEEKLY_MENU_SEASON_LABEL: Record<string, string> = {
  spring: "mùa xuân",
  summer: "mùa hạ",
  autumn: "mùa thu",
  winter: "mùa đông",
};

const WEEKLY_MENU_FOCUS_LABEL: Record<string, string> = {
  coffee: "cà phê",
  milk: "sữa",
  tea: "trà",
  vietnamese: "đặc sản Việt Nam",
  creative: "sáng tạo",
};

/**
 * Generate a 7-day rotating special menu (Mon-Sun) with one drink suggestion
 * per day. Returns a list of exactly 7 entries with weekdays in Vietnamese
 * abbreviation order ["T2","T3","T4","T5","T6","T7","CN"].
 */
export async function generateWeeklyMenu(args: {
  season: string;
  focus: string;
}): Promise<{ days: WeeklyMenuDay[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Weekly menu service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const seasonLabel = WEEKLY_MENU_SEASON_LABEL[args.season];
  const focusLabel = WEEKLY_MENU_FOCUS_LABEL[args.focus];
  if (!seasonLabel) throw new Error("Mùa không hợp lệ");
  if (!focusLabel) throw new Error("Chủ đề không hợp lệ");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia lên kế hoạch menu sáng tạo cho quán cà phê Việt Nam. " +
        "Bạn biết cách thiết kế menu xoay vòng theo tuần, mỗi ngày một món đặc biệt khác nhau, " +
        "đảm bảo đa dạng về hương vị, nguyên liệu và cảm hứng. " +
        "Tên món ngắn gọn, hấp dẫn, phù hợp văn hoá Việt Nam. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy lập một menu đặc biệt 7 ngày (xoay vòng từ Thứ Hai đến Chủ Nhật) cho quán cà phê Việt Nam với:\n` +
        `- Mùa: ${seasonLabel}\n` +
        `- Chủ đề trọng tâm: ${focusLabel}\n\n` +
        `Trả về JSON đúng cấu trúc sau:\n` +
        `{"days":[{"weekday":"T2","name":"<tên món>","description":"<mô tả 1 câu>"}, ...]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "days" phải có ĐÚNG 7 phần tử.\n` +
        `- Trường "weekday" phải lần lượt theo thứ tự: "T2","T3","T4","T5","T6","T7","CN".\n` +
        `- "name" dài 2-50 ký tự, không rỗng.\n` +
        `- "description" là một câu mô tả ngắn (5-150 ký tự), không xuống dòng.\n` +
        `- 7 món phải khác nhau (không lặp tên), thể hiện rõ chủ đề và mùa.\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Weekly menu API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi menu tuần rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi menu tuần không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi menu tuần không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.days;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi menu tuần thiếu mảng 'days'");
  }
  if (rawList.length !== 7) {
    throw new Error(`Cần đúng 7 ngày, nhận được ${rawList.length}`);
  }

  const seenNames = new Set<string>();
  const days: WeeklyMenuDay[] = rawList.map((item, idx): WeeklyMenuDay => {
    if (!item || typeof item !== "object") {
      throw new Error(`Ngày ${idx + 1} không hợp lệ`);
    }
    const rec = item as Record<string, unknown>;
    const weekday = typeof rec.weekday === "string" ? rec.weekday.trim() : "";
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const description =
      typeof rec.description === "string"
        ? rec.description.trim().replace(/\s+/g, " ")
        : "";

    const expectedWeekday = WEEKLY_MENU_WEEKDAYS[idx];
    if (weekday !== expectedWeekday) {
      throw new Error(
        `Ngày ${idx + 1} có 'weekday' = "${weekday}" (cần "${expectedWeekday}")`,
      );
    }
    if (name.length < 2 || name.length > 50) {
      throw new Error(
        `Ngày ${idx + 1} có 'name' dài ${name.length} ký tự (cần 2-50)`,
      );
    }
    if (description.length < 5 || description.length > 150) {
      throw new Error(
        `Ngày ${idx + 1} có 'description' dài ${description.length} ký tự (cần 5-150)`,
      );
    }

    const key = name.toLowerCase();
    if (seenNames.has(key)) {
      throw new Error(`Tên món trùng: "${name}"`);
    }
    seenNames.add(key);

    return { weekday, name, description };
  });

  return { days };
}

// =============================================================================
// AI playlist DJ — suggest 6 cafe-friendly real-world songs by time + vibe
// =============================================================================

export type PlaylistDjTimeSlot = "morning" | "afternoon" | "evening";
export type PlaylistDjVibe =
  | "calm"
  | "upbeat"
  | "jazzy"
  | "lo-fi"
  | "instrumental";

export type PlaylistDjTrack = {
  title: string;
  artist: string;
  reason: string;
};

const PLAYLIST_DJ_TIME_DESC: Record<PlaylistDjTimeSlot, string> = {
  morning:
    "buổi sáng (sáng) — không khí năng động, tươi mới, đánh thức khách bắt đầu ngày mới với cà phê",
  afternoon:
    "buổi chiều (chiều) — không khí dịu nhẹ, thư thái, phù hợp khách ngồi làm việc hoặc trò chuyện",
  evening:
    "buổi tối (tối) — không khí ấm cúng, lãng mạn, phù hợp khách thư giãn cuối ngày",
};

const PLAYLIST_DJ_VIBE_DESC: Record<PlaylistDjVibe, string> = {
  calm: "êm dịu, nhẹ nhàng, thư giãn (calm/relaxing)",
  upbeat: "sôi động, tích cực, tràn năng lượng (upbeat/energetic)",
  jazzy: "phong cách jazz, swing, bossa nova (jazzy)",
  "lo-fi": "lo-fi hip-hop, beats chill phù hợp tập trung (lo-fi)",
  instrumental:
    "không lời (instrumental), piano/guitar/strings hoặc post-rock nhẹ",
};

/**
 * Suggest 6 real-world songs for a cafe based on time of day + vibe.
 * Returns title + artist + 1-line mood-fit reason.
 */
export async function generatePlaylistDj(args: {
  timeSlot: PlaylistDjTimeSlot;
  vibe: PlaylistDjVibe;
}): Promise<{ tracks: PlaylistDjTrack[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Playlist DJ service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const timeDesc = PLAYLIST_DJ_TIME_DESC[args.timeSlot];
  const vibeDesc = PLAYLIST_DJ_VIBE_DESC[args.vibe];
  if (!timeDesc) throw new Error("Khung giờ không hợp lệ");
  if (!vibeDesc) throw new Error("Vibe không hợp lệ");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là một DJ kiêm music curator đẳng cấp thế giới, am hiểu sâu rộng các bản nhạc " +
        "phù hợp không gian quán cà phê trên nhiều thể loại và ngôn ngữ (tiếng Anh, tiếng Việt, " +
        "tiếng Pháp, tiếng Nhật, tiếng Hàn, Bossa Nova Bồ Đào Nha, v.v.). " +
        "Bạn CHỈ được phép gợi ý các bài hát CÓ THẬT, đã phát hành chính thức, do nghệ sĩ có thật trình bày — " +
        "tuyệt đối KHÔNG bịa tên bài, tên nghệ sĩ hay album. Nếu không chắc, chọn bài kinh điển/phổ biến đã được biết rộng rãi. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy gợi ý ĐÚNG 6 bài hát thật phù hợp phát ở quán cà phê với:\n` +
        `- Khung giờ: ${timeDesc}\n` +
        `- Vibe mong muốn: ${vibeDesc}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"tracks":[{"title":"<tên bài hát chính xác>","artist":"<tên nghệ sĩ>","reason":"<1 câu giải thích vì sao bài này hợp khung giờ và vibe>"}, ...]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "tracks" phải có ĐÚNG 6 phần tử.\n` +
        `- "title" 2-100 ký tự, đúng nguyên tên bài hát chính thức.\n` +
        `- "artist" 2-100 ký tự, là nghệ sĩ/ban nhạc thực sự trình bày bài đó.\n` +
        `- "reason" là một câu ngắn 5-150 ký tự, viết bằng tiếng Việt, không xuống dòng.\n` +
        `- 6 bài phải khác nhau (không trùng tên), đa dạng nghệ sĩ nếu được.\n` +
        `- Tuyệt đối không bịa. Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Playlist DJ API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi playlist rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi playlist không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi playlist không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.tracks;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi playlist thiếu mảng 'tracks'");
  }
  if (rawList.length !== 6) {
    throw new Error(`Cần đúng 6 bài, nhận được ${rawList.length}`);
  }

  const seenTitles = new Set<string>();
  const tracks: PlaylistDjTrack[] = rawList.map((item, idx): PlaylistDjTrack => {
    if (!item || typeof item !== "object") {
      throw new Error(`Bài ${idx + 1} không hợp lệ`);
    }
    const rec = item as Record<string, unknown>;
    const title =
      typeof rec.title === "string" ? rec.title.trim().replace(/\s+/g, " ") : "";
    const artist =
      typeof rec.artist === "string"
        ? rec.artist.trim().replace(/\s+/g, " ")
        : "";
    const reason =
      typeof rec.reason === "string"
        ? rec.reason.trim().replace(/\s+/g, " ")
        : "";

    if (title.length < 2 || title.length > 100) {
      throw new Error(
        `Bài ${idx + 1} có 'title' dài ${title.length} ký tự (cần 2-100)`,
      );
    }
    if (artist.length < 2 || artist.length > 100) {
      throw new Error(
        `Bài ${idx + 1} có 'artist' dài ${artist.length} ký tự (cần 2-100)`,
      );
    }
    if (reason.length < 5 || reason.length > 150) {
      throw new Error(
        `Bài ${idx + 1} có 'reason' dài ${reason.length} ký tự (cần 5-150)`,
      );
    }

    const key = `${title.toLowerCase()}|${artist.toLowerCase()}`;
    if (seenTitles.has(key)) {
      throw new Error(`Bài trùng: "${title}" — ${artist}`);
    }
    seenTitles.add(key);

    return { title, artist, reason };
  });

  return { tracks };
}

export type SeoMetaResult = {
  seoTitle: string;
  metaDescription: string;
  keywords: string[];
  ogTitle: string;
  landingH1: string;
};

/**
 * Generate bilingual VN/EN SEO metadata bundle for a cafe landing page.
 * Used by /seo-meta admin tool. Strict on character lengths so the output
 * is safe to paste into <head> / OG tags / H1 directly.
 */
export async function generateSeoMeta(args: {
  cafeName: string;
  usps: string[];
}): Promise<SeoMetaResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("SEO meta service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const cafeName = args.cafeName.trim();
  if (cafeName.length < 2 || cafeName.length > 60) {
    throw new Error("Tên quán phải từ 2-60 ký tự");
  }
  const cleanUsps = args.usps
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .slice(0, 3);

  const uspsBlock =
    cleanUsps.length > 0
      ? `Điểm khác biệt (USP) chủ quán muốn nhấn mạnh:\n` +
        cleanUsps.map((u, i) => `${i + 1}. ${u}`).join("\n") +
        `\n\n`
      : `Chủ quán không cung cấp USP cụ thể — bạn được tự do nhấn mạnh không gian, đồ uống và trải nghiệm chung.\n\n`;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là copywriter SEO song ngữ Việt-Anh chuyên cho ngành F&B " +
        "(quán cà phê, nhà hàng nhỏ) tại Việt Nam. Bạn nắm vững giới hạn " +
        "ký tự của Google SERP, Open Graph, và biết cách trộn tự nhiên " +
        "tiếng Việt có dấu với từ khoá tiếng Anh phổ biến (specialty " +
        "coffee, brunch, workspace...). Văn phong gọn, gợi cảm xúc, " +
        "không sến, không nhồi từ khoá. CHỈ trả về JSON đúng cấu trúc " +
        "— không markdown, không tiền tố, không giải thích.",
    },
    {
      role: "user",
      content:
        `Hãy tạo bộ metadata SEO đầy đủ cho landing page của quán cà phê sau:\n` +
        `- Tên quán: ${cafeName}\n\n` +
        uspsBlock +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"seoTitle":"<title>","metaDescription":"<meta>",` +
        `"keywords":["<kw1>","<kw2>","<kw3>","<kw4>","<kw5>"],` +
        `"ogTitle":"<og>","landingH1":"<h1>"}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "seoTitle": 10-60 ký tự, BẮT BUỘC chứa "${cafeName}", có thể thêm địa danh hoặc mô tả ngắn.\n` +
        `- "metaDescription": 140-160 ký tự, mô tả hấp dẫn dùng cho SERP, kêu gọi ghé quán.\n` +
        `- "keywords": ĐÚNG 5 từ khoá, mỗi từ 2-30 ký tự, trộn tiếng Việt và tiếng Anh, không trùng nhau.\n` +
        `- "ogTitle": 10-70 ký tự, catchy hơn seoTitle, dùng cho Facebook/Zalo share.\n` +
        `- "landingH1": 5-80 ký tự, tiêu đề H1 cho landing page, gợi cảm xúc.\n` +
        `- Không markdown, không emoji, không trailing comma, không thêm trường khác.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 600,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SEO meta API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi SEO meta rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi SEO meta không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi SEO meta không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const seoTitle =
    typeof root.seoTitle === "string" ? root.seoTitle.trim() : "";
  const metaDescription =
    typeof root.metaDescription === "string"
      ? root.metaDescription.trim()
      : "";
  const ogTitle = typeof root.ogTitle === "string" ? root.ogTitle.trim() : "";
  const landingH1 =
    typeof root.landingH1 === "string" ? root.landingH1.trim() : "";
  const rawKeywords = root.keywords;

  if (seoTitle.length < 10 || seoTitle.length > 60) {
    throw new Error(
      `'seoTitle' dài ${seoTitle.length} ký tự (cần 10-60)`,
    );
  }
  // Slack on the 100-170 range as instructed.
  if (metaDescription.length < 100 || metaDescription.length > 170) {
    throw new Error(
      `'metaDescription' dài ${metaDescription.length} ký tự (cần 100-170)`,
    );
  }
  if (ogTitle.length < 10 || ogTitle.length > 80) {
    throw new Error(`'ogTitle' dài ${ogTitle.length} ký tự (cần 10-80)`);
  }
  if (landingH1.length < 5 || landingH1.length > 80) {
    throw new Error(`'landingH1' dài ${landingH1.length} ký tự (cần 5-80)`);
  }
  if (!Array.isArray(rawKeywords) || rawKeywords.length !== 5) {
    throw new Error(
      `'keywords' phải có ĐÚNG 5 phần tử (nhận ${
        Array.isArray(rawKeywords) ? rawKeywords.length : "không phải mảng"
      })`,
    );
  }

  const seenKw = new Set<string>();
  const keywords: string[] = rawKeywords.map((kw, idx): string => {
    const value = typeof kw === "string" ? kw.trim() : "";
    if (value.length < 2 || value.length > 30) {
      throw new Error(
        `Từ khoá ${idx + 1} dài ${value.length} ký tự (cần 2-30)`,
      );
    }
    const key = value.toLowerCase();
    if (seenKw.has(key)) {
      throw new Error(`Từ khoá trùng: "${value}"`);
    }
    seenKw.add(key);
    return value;
  });

  return { seoTitle, metaDescription, keywords, ogTitle, landingH1 };
}

export type CustomerPersona = {
  name: string;
  ageRange: string;
  occupation: string;
  visitFrequency: string;
  preferredDrink: string;
  visitPurpose: string;
  painPoints: string[];
  marketingAngle: string;
};

const PERSONA_VIBE_DESC: Record<string, string> = {
  cozy: "ấm cúng, gần gũi, thân mật (cozy)",
  modern: "hiện đại, tối giản, công nghiệp nhẹ (modern)",
  luxe: "sang trọng, cao cấp, tinh tế (luxe/premium)",
  youth: "trẻ trung, năng động, hợp gen Z (youth)",
  bohemian: "phóng khoáng, nghệ sĩ, retro Bohemian",
  "student-friendly":
    "thân thiện sinh viên, ổ cắm nhiều, wifi mạnh, giá hợp lý",
};

const PERSONA_LOCATION_DESC: Record<string, string> = {
  downtown: "trung tâm thành phố, đông người qua lại (downtown)",
  residential: "khu dân cư, nhiều gia đình và người sống lâu dài",
  university: "gần trường đại học, đông sinh viên",
  "business district":
    "khu văn phòng/kinh doanh, nhân viên công sở (business district)",
  touristy: "khu du lịch, đông khách phương xa và khách nước ngoài",
};

const PERSONA_PRICE_DESC: Record<string, string> = {
  budget: "bình dân, giá rẻ phù hợp số đông (budget)",
  mid: "tầm trung, giá vừa phải (mid-range)",
  premium: "cao cấp, giá cao đi kèm trải nghiệm sang trọng (premium)",
};

export async function generateCustomerPersonas(args: {
  vibe: string;
  location: string;
  priceTier: string;
}): Promise<{ personas: CustomerPersona[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Persona service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const vibeDesc = PERSONA_VIBE_DESC[args.vibe];
  const locationDesc = PERSONA_LOCATION_DESC[args.location];
  const priceDesc = PERSONA_PRICE_DESC[args.priceTier];
  if (!vibeDesc) throw new Error("Vibe không hợp lệ");
  if (!locationDesc) throw new Error("Loại địa điểm không hợp lệ");
  if (!priceDesc) throw new Error("Phân khúc giá không hợp lệ");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia nghiên cứu thị trường ngành cà phê tại Việt Nam, thông thạo song ngữ Việt/Anh (bilingual VN/EN cafe market researcher). " +
        "Bạn am hiểu hành vi khách hàng địa phương, biết phân khúc theo độ tuổi, nghề nghiệp và mục đích đến quán. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy phân tích quán cà phê có các đặc điểm sau:\n` +
        `- Vibe / không khí: ${vibeDesc}\n` +
        `- Loại địa điểm: ${locationDesc}\n` +
        `- Phân khúc giá: ${priceDesc}\n\n` +
        `Tạo ĐÚNG 3 customer persona (chân dung khách hàng) chi tiết, đa dạng, không trùng lặp về độ tuổi/nghề nghiệp.\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"personas":[{"name":"<tên Việt giả định>","ageRange":"<vd 22-30>","occupation":"<nghề nghiệp>","visitFrequency":"<vd 2-3 lần/tuần>","preferredDrink":"<đồ uống yêu thích>","visitPurpose":"<mục đích đến quán>","painPoints":["<vấn đề 1>","<vấn đề 2>"],"marketingAngle":"<1 câu cách thu hút persona này>"}, ...]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "personas" phải có ĐÚNG 3 phần tử.\n` +
        `- "name" là tên người Việt giả định (2-30 ký tự).\n` +
        `- "ageRange" theo định dạng "X-Y" (vd "22-30").\n` +
        `- Tất cả nội dung viết bằng tiếng Việt tự nhiên.\n` +
        `- "painPoints" là mảng có 2-3 chuỗi ngắn, không rỗng.\n` +
        `- "marketingAngle" đúng 1 câu (10-200 ký tự), nói rõ cách thu hút persona này.\n` +
        `- 3 persona phải khác biệt rõ rệt (độ tuổi/nghề nghiệp).\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Persona API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi persona rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi persona không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi persona không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.personas;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi persona thiếu mảng 'personas'");
  }
  if (rawList.length !== 3) {
    throw new Error(`Cần đúng 3 persona, nhận được ${rawList.length}`);
  }

  const ageRangeRe = /^\d{1,2}\s*-\s*\d{1,3}$/;

  const personas: CustomerPersona[] = rawList.map(
    (item, idx): CustomerPersona => {
      if (!item || typeof item !== "object") {
        throw new Error(`Persona ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;
      const trimStr = (v: unknown): string =>
        typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";

      const name = trimStr(rec.name);
      const ageRange = trimStr(rec.ageRange);
      const occupation = trimStr(rec.occupation);
      const visitFrequency = trimStr(rec.visitFrequency);
      const preferredDrink = trimStr(rec.preferredDrink);
      const visitPurpose = trimStr(rec.visitPurpose);
      const marketingAngle = trimStr(rec.marketingAngle);

      if (name.length < 2 || name.length > 30) {
        throw new Error(
          `Persona ${idx + 1} có 'name' dài ${name.length} ký tự (cần 2-30)`,
        );
      }
      if (!ageRangeRe.test(ageRange)) {
        throw new Error(
          `Persona ${idx + 1} có 'ageRange' không hợp lệ ("${ageRange}")`,
        );
      }
      if (occupation.length < 2 || occupation.length > 100) {
        throw new Error(
          `Persona ${idx + 1} có 'occupation' không hợp lệ`,
        );
      }
      if (visitFrequency.length < 2 || visitFrequency.length > 80) {
        throw new Error(
          `Persona ${idx + 1} có 'visitFrequency' không hợp lệ`,
        );
      }
      if (preferredDrink.length < 2 || preferredDrink.length > 100) {
        throw new Error(
          `Persona ${idx + 1} có 'preferredDrink' không hợp lệ`,
        );
      }
      if (visitPurpose.length < 2 || visitPurpose.length > 200) {
        throw new Error(
          `Persona ${idx + 1} có 'visitPurpose' không hợp lệ`,
        );
      }
      if (marketingAngle.length < 10 || marketingAngle.length > 200) {
        throw new Error(
          `Persona ${idx + 1} có 'marketingAngle' dài ${marketingAngle.length} ký tự (cần 10-200)`,
        );
      }

      const rawPain = rec.painPoints;
      if (!Array.isArray(rawPain)) {
        throw new Error(`Persona ${idx + 1} thiếu 'painPoints' dạng mảng`);
      }
      if (rawPain.length < 2 || rawPain.length > 3) {
        throw new Error(
          `Persona ${idx + 1} có ${rawPain.length} pain point (cần 2-3)`,
        );
      }
      const painPoints = rawPain.map((p, pi): string => {
        const s = typeof p === "string" ? p.trim().replace(/\s+/g, " ") : "";
        if (s.length < 3 || s.length > 200) {
          throw new Error(
            `Persona ${idx + 1} pain point ${pi + 1} không hợp lệ`,
          );
        }
        return s;
      });

      return {
        name,
        ageRange: ageRange.replace(/\s+/g, ""),
        occupation,
        visitFrequency,
        preferredDrink,
        visitPurpose,
        painPoints,
        marketingAngle,
      };
    },
  );

  return { personas };
}

// ---------------------------------------------------------------------------
// Task Suggester
// ---------------------------------------------------------------------------

export type SuggesterFactsForAI = {
  employeesByRole: Record<string, number>;
  shiftsToday: number;
  attendanceTodayCount: number;
  openAttendance: number;
  overdueTasksCount: number;
  pendingLeavesCount: number;
  birthdaysToday: number;
  recentKudosCount: number;
};

export type TaskSuggestionPriority = "low" | "normal" | "high" | "urgent";
export type TaskSuggestionDue = "today" | "tomorrow" | "this-week";

export type TaskSuggestion = {
  title: string;
  priority: TaskSuggestionPriority;
  assigneeRole: string;
  due: TaskSuggestionDue;
  reason: string;
};

const ALLOWED_PRIORITIES: ReadonlySet<TaskSuggestionPriority> = new Set([
  "low",
  "normal",
  "high",
  "urgent",
]);
const ALLOWED_DUES: ReadonlySet<TaskSuggestionDue> = new Set([
  "today",
  "tomorrow",
  "this-week",
]);
const ALLOWED_ROLES: ReadonlySet<string> = new Set([
  "barista",
  "server",
  "cashier",
  "manager",
  "any",
]);

/**
 * Ask the AI for 5 actionable Vietnamese task suggestions for a single shift,
 * derived from today's operational facts.
 */
export async function generateTaskSuggestions(
  facts: SuggesterFactsForAI,
): Promise<{ suggestions: TaskSuggestion[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Task suggester service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const factsJson = JSON.stringify(facts);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý vận hành quán cà phê Việt Nam có nhiều năm kinh nghiệm. " +
        "Bạn đưa ra các đầu việc cụ thể, vừa sức một ca làm, ưu tiên những vấn đề " +
        "đang nổi cộm dựa trên dữ liệu thực tế. Luôn dùng tiếng Việt tự nhiên, " +
        "không markdown, không emoji.",
    },
    {
      role: "user",
      content:
        `Dữ liệu vận hành hôm nay (JSON):\n${factsJson}\n\n` +
        `Hãy đề xuất ĐÚNG 5 task hành động cho hôm nay/tuần này.\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"suggestions":[{"title":"<≤60 ký tự>","priority":"low|normal|high|urgent","assigneeRole":"barista|server|cashier|manager|any","due":"today|tomorrow|this-week","reason":"<1 câu giải thích>"}, ...]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "suggestions" phải có ĐÚNG 5 phần tử.\n` +
        `- "title" tiếng Việt, ngắn gọn, hành động (động từ đứng đầu), tối đa 60 ký tự.\n` +
        `- "priority" phải là một trong: low, normal, high, urgent.\n` +
        `- "assigneeRole" phải là một trong: barista, server, cashier, manager, any.\n` +
        `- "due" phải là một trong: today, tomorrow, this-week.\n` +
        `- "reason" đúng 1 câu tiếng Việt (10-200 ký tự), liên hệ trực tiếp tới dữ liệu.\n` +
        `- Mỗi task phải khác biệt rõ rệt; ưu tiên các con số đang cao bất thường.\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Task suggester API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi gợi ý task rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi gợi ý task không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi gợi ý task không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.suggestions;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi gợi ý task thiếu mảng 'suggestions'");
  }
  if (rawList.length !== 5) {
    throw new Error(`Cần đúng 5 gợi ý, nhận được ${rawList.length}`);
  }

  const trimStr = (v: unknown): string =>
    typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";

  const suggestions: TaskSuggestion[] = rawList.map(
    (item, idx): TaskSuggestion => {
      if (!item || typeof item !== "object") {
        throw new Error(`Gợi ý ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;

      const title = trimStr(rec.title);
      if (title.length < 3 || title.length > 60) {
        throw new Error(
          `Gợi ý ${idx + 1} có 'title' dài ${title.length} ký tự (cần 3-60)`,
        );
      }

      const priorityRaw = trimStr(rec.priority).toLowerCase();
      if (!ALLOWED_PRIORITIES.has(priorityRaw as TaskSuggestionPriority)) {
        throw new Error(
          `Gợi ý ${idx + 1} có 'priority' không hợp lệ ("${priorityRaw}")`,
        );
      }
      const priority = priorityRaw as TaskSuggestionPriority;

      const assigneeRoleRaw = trimStr(rec.assigneeRole).toLowerCase();
      if (!ALLOWED_ROLES.has(assigneeRoleRaw)) {
        throw new Error(
          `Gợi ý ${idx + 1} có 'assigneeRole' không hợp lệ ("${assigneeRoleRaw}")`,
        );
      }

      const dueRaw = trimStr(rec.due).toLowerCase();
      if (!ALLOWED_DUES.has(dueRaw as TaskSuggestionDue)) {
        throw new Error(
          `Gợi ý ${idx + 1} có 'due' không hợp lệ ("${dueRaw}")`,
        );
      }
      const due = dueRaw as TaskSuggestionDue;

      const reason = trimStr(rec.reason);
      if (reason.length < 10 || reason.length > 200) {
        throw new Error(
          `Gợi ý ${idx + 1} có 'reason' dài ${reason.length} ký tự (cần 10-200)`,
        );
      }

      return {
        title,
        priority,
        assigneeRole: assigneeRoleRaw,
        due,
        reason,
      };
    },
  );

  return { suggestions };
}

export type VisionStatementValue = {
  name: string;
  description: string;
};

export type VisionStatementResult = {
  vision: string;
  mission: string;
  values: VisionStatementValue[];
};

/**
 * Generate a Vietnamese cafe brand vision/mission/values statement set.
 * - Vision: 1 sentence, ≤ 25 words
 * - Mission: 1-2 sentences, ≤ 50 words
 * - Values: exactly 5 entries (name 1-30 chars, description 5-100 chars)
 */
export async function generateVisionStatement(args: {
  yearsInBusiness: number;
  targetCustomer: string;
  usp: string;
}): Promise<VisionStatementResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Vision statement service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const years = Math.round(args.yearsInBusiness);
  if (!Number.isFinite(years) || years < 1 || years > 50) {
    throw new Error("yearsInBusiness phải nằm trong khoảng 1-50");
  }
  const targetCustomer = args.targetCustomer.trim().replace(/\s+/g, " ");
  const usp = args.usp.trim().replace(/\s+/g, " ");
  if (targetCustomer.length < 5 || targetCustomer.length > 200) {
    throw new Error("targetCustomer phải dài 5-200 ký tự");
  }
  if (usp.length < 5 || usp.length > 200) {
    throw new Error("usp phải dài 5-200 ký tự");
  }

  const payload = {
    yearsInBusiness: years,
    targetCustomer,
    usp,
  };

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia chiến lược thương hiệu song ngữ Việt-Anh, " +
        "chuyên cho ngành F&B và quán cà phê tại Việt Nam. Bạn viết " +
        "tuyên ngôn tầm nhìn, sứ mệnh và bộ giá trị cốt lõi súc tích, " +
        "có cảm xúc, có tính khả thi, đúng văn phong thương hiệu Việt. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải " +
        "thích ngoài cấu trúc, không tiền tố, không trailing comma.",
    },
    {
      role: "user",
      content:
        `Hãy viết bộ tuyên ngôn thương hiệu (Vision/Mission/Values) cho ` +
        `quán cà phê dựa trên dữ liệu sau (JSON):\n` +
        `${JSON.stringify(payload)}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"vision":"<1 câu tiếng Việt>",` +
        `"mission":"<1-2 câu tiếng Việt>",` +
        `"values":[{"name":"<tên giá trị>","description":"<mô tả 1 dòng>"}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "vision": tiếng Việt, ĐÚNG 1 câu, tối đa 25 từ, gợi cảm hứng.\n` +
        `- "mission": tiếng Việt, 1-2 câu, tối đa 50 từ, nêu rõ giá trị mang lại cho khách.\n` +
        `- "values": mảng có ĐÚNG 5 phần tử, KHÔNG TRÙNG name.\n` +
        `- Mỗi value.name: 1-3 từ, 1-30 ký tự (ví dụ "Tận tâm", "Bền vững").\n` +
        `- Mỗi value.description: 1 câu ngắn, 5-100 ký tự, tiếng Việt.\n` +
        `- Phù hợp đối tượng khách "${targetCustomer}" và USP "${usp}".\n` +
        `- Không thêm trường khác. Không markdown.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.75,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Vision statement API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi tuyên ngôn rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi tuyên ngôn không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi tuyên ngôn không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const vision =
    typeof root.vision === "string"
      ? root.vision.trim().replace(/\s+/g, " ")
      : "";
  const mission =
    typeof root.mission === "string"
      ? root.mission.trim().replace(/\s+/g, " ")
      : "";

  const wordCount = (s: string): number =>
    s.split(/\s+/).filter((w) => w.length > 0).length;

  if (vision.length === 0) {
    throw new Error("Thiếu trường 'vision' trong phản hồi");
  }
  if (wordCount(vision) > 25) {
    throw new Error(
      `'vision' dài ${wordCount(vision)} từ (tối đa 25 từ)`,
    );
  }
  if (mission.length === 0) {
    throw new Error("Thiếu trường 'mission' trong phản hồi");
  }
  if (wordCount(mission) > 50) {
    throw new Error(
      `'mission' dài ${wordCount(mission)} từ (tối đa 50 từ)`,
    );
  }

  const rawValues = root.values;
  if (!Array.isArray(rawValues)) {
    throw new Error("Phản hồi tuyên ngôn thiếu mảng 'values'");
  }
  if (rawValues.length !== 5) {
    throw new Error(
      `Cần đúng 5 giá trị cốt lõi, nhận được ${rawValues.length}`,
    );
  }

  const seenNames = new Set<string>();
  const values: VisionStatementValue[] = rawValues.map(
    (item, idx): VisionStatementValue => {
      if (!item || typeof item !== "object") {
        throw new Error(`Giá trị ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;
      const name =
        typeof rec.name === "string"
          ? rec.name.trim().replace(/\s+/g, " ")
          : "";
      const description =
        typeof rec.description === "string"
          ? rec.description.trim().replace(/\s+/g, " ")
          : "";

      if (name.length < 1 || name.length > 30) {
        throw new Error(
          `Giá trị ${idx + 1} có 'name' dài ${name.length} ký tự (cần 1-30)`,
        );
      }
      if (description.length < 5 || description.length > 100) {
        throw new Error(
          `Giá trị ${idx + 1} có 'description' dài ${description.length} ký tự (cần 5-100)`,
        );
      }

      const key = name.toLowerCase();
      if (seenNames.has(key)) {
        throw new Error(`Giá trị cốt lõi trùng tên: "${name}"`);
      }
      seenNames.add(key);

      return { name, description };
    },
  );

  return { vision, mission, values };
}

/**
 * Generate 10 Vietnamese self-reflection prompts for a cafe staff member's
 * work-satisfaction self-assessment. All prompts are POSITIVELY framed so a
 * 1-5 Likert scale (1 = Hoàn toàn không đồng ý, 5 = Hoàn toàn đồng ý) maps
 * cleanly to a happiness score.
 */
export async function generateSelfAssessmentQuestions(
  role: string,
): Promise<{ questions: string[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Self-assessment service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const safeRole = role.trim().slice(0, 40) || "nhân viên";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là HR coach cho quán cà phê Việt Nam, am hiểu tâm lý và động lực " +
        "làm việc của nhân viên dịch vụ. Nhiệm vụ: thiết kế những câu hỏi tự " +
        "phản chiếu (self-reflection) ngắn gọn, ấm áp, đời thường và giàu suy " +
        "ngẫm để nhân viên tự đánh giá mức độ hài lòng & hạnh phúc trong công " +
        "việc. Câu hỏi luôn được diễn đạt theo HƯỚNG TÍCH CỰC để thang điểm " +
        "1 = Hoàn toàn không đồng ý đến 5 = Hoàn toàn đồng ý phản ánh đúng mức " +
        "độ hạnh phúc. CHỈ trả về JSON hợp lệ, không markdown, không lời dẫn.",
    },
    {
      role: "user",
      content:
        `Vai trò trong quán: ${safeRole}.\n\n` +
        "Hãy soạn ĐÚNG 10 câu khẳng định tiếng Việt để nhân viên tự đánh giá " +
        "mức độ đồng ý theo thang Likert 5 điểm (1 = Hoàn toàn không đồng ý, " +
        "5 = Hoàn toàn đồng ý). Tất cả câu phải mang sắc thái TÍCH CỰC: đồng " +
        "ý cao = hạnh phúc cao. Bao quát nhiều khía cạnh: ý nghĩa công việc, " +
        "đồng đội, quản lý, lịch trình, lương thưởng, phát triển bản thân, " +
        "khách hàng, không gian quán, cân bằng cuộc sống, sự công nhận. " +
        'Trả về JSON đúng dạng: {"questions":["...","...", ... 10 chuỗi]}. ' +
        "Mỗi chuỗi 10-150 ký tự, viết hoa đầu câu, kết thúc bằng dấu chấm. " +
        "Không đánh số, không thêm trường khác, không markdown.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Self-assessment API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi self-assessment rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi self-assessment không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi self-assessment không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawQuestions = root.questions;
  if (!Array.isArray(rawQuestions)) {
    throw new Error("Phản hồi self-assessment thiếu mảng 'questions'");
  }
  if (rawQuestions.length !== 10) {
    throw new Error(
      `Cần đúng 10 câu hỏi, nhận được ${rawQuestions.length}`,
    );
  }

  const questions: string[] = rawQuestions.map((item, idx): string => {
    if (typeof item !== "string") {
      throw new Error(`Câu ${idx + 1} không phải chuỗi`);
    }
    const q = item.trim().replace(/\s+/g, " ");
    if (q.length < 10 || q.length > 150) {
      throw new Error(
        `Câu ${idx + 1} dài ${q.length} ký tự (cần 10-150)`,
      );
    }
    return q;
  });

  return { questions };
}

// ---------------------------------------------------------------------------
// Finance health analyzer
// ---------------------------------------------------------------------------

export type FinanceHealthFacts = {
  revenueWeek: number;
  revenueMonth: number;
  expensesWeek: number;
  expensesMonth: number;
  payrollMonth: number;
  payrollPrevMonth: number;
  employeeCount: number;
};

export type FinanceHealthResult = {
  score: number;
  strengths: string[];
  risks: string[];
  actions: string[];
};

function parseStringTriplet(
  raw: unknown,
  field: "strengths" | "risks" | "actions",
): string[] {
  if (!Array.isArray(raw)) {
    throw new Error(`Phản hồi thiếu mảng '${field}'`);
  }
  if (raw.length !== 3) {
    throw new Error(
      `Cần đúng 3 mục cho '${field}', nhận được ${raw.length}`,
    );
  }
  const out: string[] = raw.map((item, idx): string => {
    if (typeof item !== "string") {
      throw new Error(`Mục '${field}' #${idx + 1} không phải chuỗi`);
    }
    const cleaned = item.trim().replace(/\s+/g, " ");
    if (cleaned.length < 5 || cleaned.length > 150) {
      throw new Error(
        `Mục '${field}' #${idx + 1} dài ${cleaned.length} ký tự (cần 5-150)`,
      );
    }
    return cleaned;
  });
  return out;
}

export async function analyzeFinanceHealth(
  facts: FinanceHealthFacts,
): Promise<FinanceHealthResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Finance health service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const factsJson = JSON.stringify(facts);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia phân tích tài chính cho quán cà phê Việt Nam. Đánh giá khách quan, ngắn gọn, có tính hành động cụ thể. Chỉ trả về JSON hợp lệ theo cấu trúc được yêu cầu, không markdown, không giải thích thêm.",
    },
    {
      role: "user",
      content:
        `Dưới đây là số liệu tài chính của quán (đơn vị tiền: VND, JSON):\n${factsJson}\n\n` +
        "Hãy đánh giá sức khỏe tài chính tổng thể và trả về JSON đúng dạng: " +
        '{"score": <số nguyên 0-100>, "strengths": ["câu 1", "câu 2", "câu 3"], "risks": ["câu 1", "câu 2", "câu 3"], "actions": ["câu 1", "câu 2", "câu 3"]}. ' +
        "Mỗi câu bằng tiếng Việt, dài 5-150 ký tự. " +
        "strengths là 3 điểm mạnh, risks là 3 rủi ro, actions là 3 việc cần làm dạng mệnh lệnh. " +
        "Cân nhắc tỉ lệ chi phí/doanh thu, biến động lương theo tháng, doanh thu tuần so với tháng, và quy mô nhân sự.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Finance health API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi phân tích tài chính rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi phân tích tài chính không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi phân tích tài chính không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawScore = root.score;
  const scoreNum =
    typeof rawScore === "number" ? rawScore : Number(rawScore);
  if (!Number.isFinite(scoreNum)) {
    throw new Error("Trường 'score' không phải số");
  }
  const score = Math.round(scoreNum);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error(`'score' = ${score} ngoài khoảng 0-100`);
  }

  const strengths = parseStringTriplet(root.strengths, "strengths");
  const risks = parseStringTriplet(root.risks, "risks");
  const actions = parseStringTriplet(root.actions, "actions");

  return { score, strengths, risks, actions };
}

export type PricingSuggestion = {
  item: string;
  suggestedPriceVnd: number;
  reasoning: string;
};

/**
 * Generate AI cafe pricing suggestions for a small set of menu items, given the
 * average cost per cup, competitor average price for similar items, and the
 * desired gross margin. Each suggestion is rounded to the nearest 1,000 VND
 * and includes a 1-2 sentence Vietnamese rationale tying it back to cost,
 * competition and margin.
 */
export async function generatePricingStrategy(args: {
  costPerCupVnd: number;
  competitorAvgVnd: number;
  targetMarginPct: number;
  items: string[];
}): Promise<{ suggestions: PricingSuggestion[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Pricing strategy service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const { costPerCupVnd, competitorAvgVnd, targetMarginPct, items } = args;

  if (
    !Number.isFinite(costPerCupVnd) ||
    costPerCupVnd < 1000 ||
    costPerCupVnd > 50000
  ) {
    throw new Error("Chi phí trung bình mỗi ly phải trong khoảng 1.000-50.000 VND");
  }
  if (
    !Number.isFinite(competitorAvgVnd) ||
    competitorAvgVnd < 5000 ||
    competitorAvgVnd > 200000
  ) {
    throw new Error(
      "Giá trung bình của đối thủ phải trong khoảng 5.000-200.000 VND",
    );
  }
  if (
    !Number.isFinite(targetMarginPct) ||
    targetMarginPct < 40 ||
    targetMarginPct > 90
  ) {
    throw new Error("Tỉ suất lợi nhuận mục tiêu phải trong khoảng 40-90%");
  }
  if (!Array.isArray(items) || items.length < 1 || items.length > 5) {
    throw new Error("Cần 1-5 món để gợi ý giá");
  }
  const cleanItems = items.map((s) => s.trim()).filter((s) => s.length > 0);
  if (cleanItems.length !== items.length) {
    throw new Error("Tên món không được rỗng");
  }

  const itemListJson = JSON.stringify(cleanItems);
  const minPrice = costPerCupVnd;
  const maxPrice = competitorAvgVnd * 4;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia định giá cho quán cà phê Việt Nam, có kinh nghiệm phân tích cạnh tranh, " +
        "định vị thương hiệu và tối ưu biên lợi nhuận. Bạn hiểu thị trường đồ uống tầm trung tại " +
        "Việt Nam và biết cân bằng giữa chi phí, giá đối thủ và mục tiêu margin. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy đề xuất giá bán cho danh sách món sau dựa trên các yếu tố:\n` +
        `- Chi phí trung bình mỗi ly: ${costPerCupVnd} VND\n` +
        `- Giá trung bình của đối thủ cho món tương tự: ${competitorAvgVnd} VND\n` +
        `- Biên lợi nhuận gộp mục tiêu: ${targetMarginPct}%\n` +
        `- Danh sách món (${cleanItems.length} món, theo thứ tự): ${itemListJson}\n\n` +
        `Trả về JSON đúng cấu trúc sau:\n` +
        `{"suggestions":[{"item":"<tên món, GIỮ NGUYÊN như input>","suggestedPriceVnd":<số nguyên dương, ` +
        `LÀM TRÒN đến hàng 1.000 VND gần nhất>,"reasoning":"<1-2 câu tiếng Việt ngắn gọn>"}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "suggestions" phải có ĐÚNG ${cleanItems.length} phần tử, theo đúng thứ tự danh sách trên.\n` +
        `- "item" phải GIỮ NGUYÊN tên trong danh sách (không sửa chính tả, không thêm bớt).\n` +
        `- "suggestedPriceVnd" là số nguyên dương, làm tròn đến hàng 1.000 VND, ` +
        `nằm trong khoảng [${minPrice}, ${maxPrice}].\n` +
        `- "reasoning" 10-200 ký tự tiếng Việt, nêu rõ lý do (chi phí, đối thủ, margin, định vị).\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Pricing strategy API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi gợi ý giá rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi gợi ý giá không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi gợi ý giá không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.suggestions;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi gợi ý giá thiếu mảng 'suggestions'");
  }
  if (rawList.length !== cleanItems.length) {
    throw new Error(
      `Cần đúng ${cleanItems.length} gợi ý giá, nhận được ${rawList.length}`,
    );
  }

  const suggestions: PricingSuggestion[] = rawList.map(
    (entry, idx): PricingSuggestion => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`Gợi ý ${idx + 1} không hợp lệ`);
      }
      const rec = entry as Record<string, unknown>;

      const itemRaw = typeof rec.item === "string" ? rec.item.trim() : "";
      if (!itemRaw) throw new Error(`Gợi ý ${idx + 1} thiếu 'item'`);
      // Prefer the original item name to keep card alignment stable even if
      // the model lightly normalised casing/whitespace.
      const item = cleanItems[idx] ?? itemRaw;

      const rawPrice = rec.suggestedPriceVnd;
      const priceNum =
        typeof rawPrice === "number"
          ? rawPrice
          : typeof rawPrice === "string"
            ? Number(rawPrice)
            : NaN;
      if (!Number.isFinite(priceNum) || priceNum <= 0) {
        throw new Error(
          `Gợi ý ${idx + 1} có 'suggestedPriceVnd' không hợp lệ`,
        );
      }
      const suggestedPriceVnd = Math.round(priceNum / 1000) * 1000;
      if (suggestedPriceVnd < minPrice || suggestedPriceVnd > maxPrice) {
        throw new Error(
          `Giá gợi ý cho '${item}' (${suggestedPriceVnd} VND) ngoài khoảng [${minPrice}, ${maxPrice}]`,
        );
      }

      const reasoning =
        typeof rec.reasoning === "string" ? rec.reasoning.trim() : "";
      if (reasoning.length < 10 || reasoning.length > 200) {
        throw new Error(
          `'reasoning' của '${item}' phải dài 10-200 ký tự (hiện ${reasoning.length})`,
        );
      }

      return { item, suggestedPriceVnd, reasoning };
    },
  );

  return { suggestions };
}

/**
 * Analyse a Vietnamese cafe's competitive landscape against 1-3 named
 * competitors. Returns differentiation summary, opportunities and risks.
 */
export type CompetitiveLandscapeResult = {
  differentiation: string;
  opportunities: string[];
  risks: string[];
};

export async function analyzeCompetitiveLandscape(args: {
  ownName: string;
  ownUsp: string;
  competitors: Array<{ name: string; notes: string }>;
}): Promise<CompetitiveLandscapeResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Competitive intel service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const ownName = args.ownName.trim().replace(/\s+/g, " ");
  const ownUsp = args.ownUsp.trim().replace(/\s+/g, " ");
  if (ownName.length < 2 || ownName.length > 200) {
    throw new Error("Tên quán phải dài 2-200 ký tự.");
  }
  if (ownUsp.length < 5 || ownUsp.length > 200) {
    throw new Error("USP phải dài 5-200 ký tự.");
  }

  const cleanCompetitors = args.competitors.map((c, idx) => {
    const name = c.name.trim().replace(/\s+/g, " ");
    const notes = c.notes.trim().replace(/\s+/g, " ");
    if (name.length < 2 || name.length > 200) {
      throw new Error(`Tên đối thủ #${idx + 1} phải dài 2-200 ký tự.`);
    }
    if (notes.length < 5 || notes.length > 200) {
      throw new Error(`Định vị đối thủ #${idx + 1} phải dài 5-200 ký tự.`);
    }
    return { name, notes };
  });
  if (cleanCompetitors.length < 1 || cleanCompetitors.length > 3) {
    throw new Error("Cần 1-3 đối thủ để phân tích.");
  }

  const competitorsBlock = cleanCompetitors
    .map((c, i) => `${i + 1}. ${c.name} — ${c.notes}`)
    .join("\n");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia chiến lược ngành F&B/cà phê tại Việt Nam, thông thạo " +
        "song ngữ Việt-Anh và am hiểu thị trường quán cà phê địa phương cũng như " +
        "các chuỗi quốc tế. Bạn phân tích định vị, cơ hội và rủi ro một cách " +
        "thực tế, ngắn gọn, có hành động. CHỈ trả về JSON đúng cấu trúc — không " +
        "markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Phân tích cảnh quan cạnh tranh cho quán cà phê dưới đây:\n` +
        `- Quán của tôi: "${ownName}"\n` +
        `- USP / điểm khác biệt: ${ownUsp}\n` +
        `- Đối thủ (${cleanCompetitors.length}):\n${competitorsBlock}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"differentiation":"<đoạn văn tiếng Việt tối đa 80 từ tóm tắt điểm khác biệt cốt lõi>",` +
        `"opportunities":["<cơ hội 1, 1-2 câu>","<cơ hội 2>","<cơ hội 3>"],` +
        `"risks":["<rủi ro 1, 1 câu>","<rủi ro 2>","<rủi ro 3>"]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "differentiation": tiếng Việt, tối đa 80 từ, tập trung vào điểm khác biệt vs các đối thủ trên.\n` +
        `- "opportunities": ĐÚNG 3 phần tử, mỗi phần tử 10-150 ký tự, là cơ hội cụ thể có thể hành động.\n` +
        `- "risks": ĐÚNG 3 phần tử, mỗi phần tử 10-150 ký tự, là rủi ro/điểm cần cảnh giác.\n` +
        `- Không markdown, không bullet ký tự, không tiền tố "1."/"-".\n` +
        `- Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Competitive intel API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi phân tích cạnh tranh rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi phân tích cạnh tranh không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi phân tích cạnh tranh không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;

  const differentiationRaw =
    typeof root.differentiation === "string" ? root.differentiation.trim() : "";
  if (differentiationRaw.length === 0) {
    throw new Error("Thiếu 'differentiation' trong phản hồi");
  }
  const wordCount = differentiationRaw.split(/\s+/).filter(Boolean).length;
  if (wordCount > 100) {
    throw new Error(
      `'differentiation' quá dài (${wordCount} từ, tối đa 80 từ với biên 100)`,
    );
  }

  const validateList = (
    raw: unknown,
    label: string,
  ): string[] => {
    if (!Array.isArray(raw)) {
      throw new Error(`'${label}' phải là mảng`);
    }
    if (raw.length !== 3) {
      throw new Error(`'${label}' cần đúng 3 phần tử (nhận ${raw.length})`);
    }
    return raw.map((entry, idx): string => {
      const text = typeof entry === "string" ? entry.trim() : "";
      if (text.length < 10 || text.length > 150) {
        throw new Error(
          `'${label}'[${idx + 1}] phải dài 10-150 ký tự (hiện ${text.length})`,
        );
      }
      return text;
    });
  };

  const opportunities = validateList(root.opportunities, "opportunities");
  const risks = validateList(root.risks, "risks");

  return {
    differentiation: differentiationRaw,
    opportunities,
    risks,
  };
}

/**
 * Generate a short Vietnamese congratulation message for the
 * "Employee of the Day" winner. ≤30 words, plain text.
 */
export async function generateEotdCongrats(args: {
  name: string;
  role: string;
  score: number;
}): Promise<{ message: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("EOTD service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý quán cà phê Việt Nam ấm áp, vui tính, đang chúc mừng nhân viên xuất sắc trong ngày. Trả lời bằng tiếng Việt tự nhiên, không markdown, không emoji, không quote mark.",
    },
    {
      role: "user",
      content: `Viết 1 câu chúc mừng ngắn (tối đa 30 từ) cho nhân viên ${args.name} (vị trí ${args.role}, điểm số hôm nay ${args.score}) vừa được vinh danh là "Nhân viên của ngày". Giọng điệu thân mật, ấm áp, có thể nhắc tên. Chỉ trả về câu chúc, không giải thích.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 200,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`EOTD API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  content = content.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  return { message: content };
}


/**
 * Generate 4 themed cafe interior-design concept cards in Vietnamese.
 * Each concept includes a name, short description, 3 key elements,
 * a 3-color palette (with Vietnamese names + hex codes) and a budget
 * estimate band.
 */
export type InteriorPaletteSwatch = {
  name: string;
  hex: string;
};

export type InteriorConcept = {
  name: string;
  description: string;
  keyElements: string[];
  palette: InteriorPaletteSwatch[];
  budgetBand: string;
};

export type InteriorConceptsResult = {
  concepts: InteriorConcept[];
};

const STYLE_DESCRIPTIONS_VN: Record<string, string> = {
  "cozy-rustic":
    "ấm cúng, mộc mạc (cozy rustic) — gỗ thô, vải lanh, ánh sáng vàng dịu",
  "minimalist-zen":
    "tối giản kiểu Nhật / zen — gọn, sạch, vật liệu tự nhiên, nhiều khoảng thở",
  "industrial-loft":
    "industrial loft — bê tông trần, ống đồng/sắt lộ, đèn Edison, gạch thô",
  "vintage-french":
    "vintage Pháp — gạch bông, gỗ cổ điển, cửa vòm, gam màu pastel cổ",
  "modern-bright":
    "hiện đại sáng (modern bright) — tông trắng, gỗ sáng, nhiều ánh sáng tự nhiên, line gọn",
};

const BUDGET_DESCRIPTIONS_VN: Record<string, string> = {
  low: "thấp (~30-80 triệu VND tổng đầu tư nội thất)",
  mid: "trung bình (~80-200 triệu VND tổng đầu tư nội thất)",
  high: "cao (>200 triệu VND tổng đầu tư nội thất, vật liệu cao cấp)",
};

const SPACE_DESCRIPTIONS_VN: Record<string, string> = {
  small: "nhỏ (<30m², khoảng 12-25 chỗ)",
  medium: "trung bình (30-80m², khoảng 25-60 chỗ)",
  large: "lớn (>80m², trên 60 chỗ, có khu riêng)",
};

export async function generateInteriorConcepts(args: {
  style: string;
  budget: string;
  spaceSize: string;
}): Promise<InteriorConceptsResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Interior design service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const styleDesc = STYLE_DESCRIPTIONS_VN[args.style];
  const budgetDesc = BUDGET_DESCRIPTIONS_VN[args.budget];
  const spaceDesc = SPACE_DESCRIPTIONS_VN[args.spaceSize];
  if (!styleDesc) throw new Error("Phong cách không hợp lệ.");
  if (!budgetDesc) throw new Error("Mức ngân sách không hợp lệ.");
  if (!spaceDesc) throw new Error("Diện tích không hợp lệ.");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là nhà thiết kế nội thất quán cà phê tại Việt Nam, có gu thẩm mỹ tinh " +
        "tế và đồng thời nhạy bén thương mại (hiểu chi phí vật liệu nội địa, ánh " +
        "sáng, lưu thông khách, đồ tiêu hao). CHỈ trả về JSON đúng cấu trúc — " +
        "không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy đề xuất ĐÚNG 4 concept thiết kế nội thất cho một quán cà phê:\n` +
        `- Phong cách định hướng: ${styleDesc}\n` +
        `- Ngân sách: ${budgetDesc}\n` +
        `- Diện tích: ${spaceDesc}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"concepts":[{"name":"<tên concept tiếng Việt, có thể có chữ Anh xen kẽ>",` +
        `"description":"<1 đoạn tiếng Việt mô tả không gian, tối đa 80 từ>",` +
        `"keyElements":["<yếu tố 1>","<yếu tố 2>","<yếu tố 3>"],` +
        `"palette":[{"name":"<tên màu tiếng Việt>","hex":"#RRGGBB"},` +
        `{"name":"<tên màu tiếng Việt>","hex":"#RRGGBB"},` +
        `{"name":"<tên màu tiếng Việt>","hex":"#RRGGBB"}],` +
        `"budgetBand":"<dải chi phí ước tính, ví dụ: 30-50tr / 50-150tr / 150tr+>"}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- ĐÚNG 4 concept, mỗi concept khác biệt rõ ràng (không trùng vibe).\n` +
        `- "name": 5-50 ký tự, gợi cảm xúc, không kèm số thứ tự "1." hoặc "Concept ".\n` +
        `- "description": tiếng Việt tự nhiên, 20-500 ký tự, không markdown, không bullet.\n` +
        `- "keyElements": ĐÚNG 3 phần tử, mỗi phần tử 3-100 ký tự (vd: "Bàn gỗ thông tái chế", "Đèn Edison treo dây vải", "Tường gạch trần sơn trắng").\n` +
        `- "palette": ĐÚNG 3 màu. Mỗi "hex" theo định dạng "#RRGGBB" (6 ký tự hex sau #), chữ in hoa hoặc thường đều được. Mỗi "name" tiếng Việt 2-40 ký tự (vd: "Nâu cà phê", "Be sữa", "Xanh rêu").\n` +
        `- "budgetBand": chuỗi ngắn 3-30 ký tự dạng "30-50tr" / "50-150tr" / "150tr+", phù hợp ngân sách & diện tích.\n` +
        `- Không markdown, không trailing comma, không trường phụ.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Interior concepts API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi gợi ý nội thất rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi gợi ý nội thất không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi gợi ý nội thất không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const conceptsRaw = root.concepts;
  if (!Array.isArray(conceptsRaw)) {
    throw new Error("'concepts' phải là mảng");
  }
  if (conceptsRaw.length !== 4) {
    throw new Error(`Cần đúng 4 concept (nhận ${conceptsRaw.length})`);
  }

  const hexRe = /^#[0-9a-fA-F]{6}$/;

  const concepts: InteriorConcept[] = conceptsRaw.map(
    (entry, idx): InteriorConcept => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`Concept #${idx + 1} không hợp lệ`);
      }
      const c = entry as Record<string, unknown>;

      const name = typeof c.name === "string" ? c.name.trim() : "";
      if (name.length < 5 || name.length > 50) {
        throw new Error(
          `Concept #${idx + 1}: 'name' phải dài 5-50 ký tự (hiện ${name.length})`,
        );
      }

      const description =
        typeof c.description === "string" ? c.description.trim() : "";
      if (description.length < 20 || description.length > 500) {
        throw new Error(
          `Concept #${idx + 1}: 'description' phải dài 20-500 ký tự (hiện ${description.length})`,
        );
      }

      const keyElementsRaw = c.keyElements;
      if (!Array.isArray(keyElementsRaw) || keyElementsRaw.length !== 3) {
        throw new Error(
          `Concept #${idx + 1}: 'keyElements' cần đúng 3 phần tử`,
        );
      }
      const keyElements = keyElementsRaw.map((el, j): string => {
        const text = typeof el === "string" ? el.trim() : "";
        if (text.length < 3 || text.length > 100) {
          throw new Error(
            `Concept #${idx + 1} keyElements[${j + 1}] phải dài 3-100 ký tự`,
          );
        }
        return text;
      });

      const paletteRaw = c.palette;
      if (!Array.isArray(paletteRaw) || paletteRaw.length !== 3) {
        throw new Error(`Concept #${idx + 1}: 'palette' cần đúng 3 màu`);
      }
      const palette: InteriorPaletteSwatch[] = paletteRaw.map(
        (sw, j): InteriorPaletteSwatch => {
          if (!sw || typeof sw !== "object") {
            throw new Error(
              `Concept #${idx + 1} palette[${j + 1}] không hợp lệ`,
            );
          }
          const swObj = sw as Record<string, unknown>;
          const swName =
            typeof swObj.name === "string" ? swObj.name.trim() : "";
          const hex = typeof swObj.hex === "string" ? swObj.hex.trim() : "";
          if (swName.length < 2 || swName.length > 40) {
            throw new Error(
              `Concept #${idx + 1} palette[${j + 1}].name phải dài 2-40 ký tự`,
            );
          }
          if (!hexRe.test(hex)) {
            throw new Error(
              `Concept #${idx + 1} palette[${j + 1}].hex phải có dạng #RRGGBB (nhận "${hex}")`,
            );
          }
          return { name: swName, hex: hex.toLowerCase() };
        },
      );

      const budgetBand =
        typeof c.budgetBand === "string" ? c.budgetBand.trim() : "";
      if (budgetBand.length < 1 || budgetBand.length > 60) {
        throw new Error(
          `Concept #${idx + 1}: 'budgetBand' không được rỗng (tối đa 60 ký tự)`,
        );
      }

      return {
        name,
        description,
        keyElements,
        palette,
        budgetBand,
      };
    },
  );

  return { concepts };
}

// ---------------------------------------------------------------------------
// Budget allocator — split a Vietnamese cafe's monthly budget across the 6
// canonical operating cost categories, weighted by the cafe's lifecycle phase
// (start-up / growth / mature). Returns VND amounts, percentage shares and a
// short Vietnamese rationale per category.
// ---------------------------------------------------------------------------

export type BudgetAllocation = {
  category: string;
  amountVnd: number;
  pct: number;
  rationale: string;
};

export type BudgetPhase = "startup" | "growth" | "mature";

export const BUDGET_CATEGORIES = [
  "Nguyên liệu",
  "Lương nhân viên",
  "Tiện ích",
  "Marketing",
  "Bảo trì",
  "Dự phòng",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

const BUDGET_TOTAL_MIN = 5_000_000;
const BUDGET_TOTAL_MAX = 500_000_000;

const PHASE_DESCRIPTIONS: Record<BudgetPhase, string> = {
  startup:
    "Quán mới mở (start-up): cần đầu tư mạnh marketing để xây thương hiệu, " +
    "kiểm soát chặt nguyên liệu và dự phòng vì doanh thu chưa ổn định.",
  growth:
    "Quán đang tăng trưởng (growth): doanh thu tăng đều, cần cân bằng giữa " +
    "marketing để mở rộng tệp khách và lương để giữ chất lượng phục vụ.",
  mature:
    "Quán đã ổn định (mature): tệp khách trung thành đã có, ưu tiên duy trì " +
    "chất lượng (nguyên liệu, bảo trì) và tối ưu chi phí marketing.",
};

function normaliseCategory(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORY_LOOKUP = new Map<string, BudgetCategory>(
  BUDGET_CATEGORIES.map((c): [string, BudgetCategory] => [
    normaliseCategory(c),
    c,
  ]),
);

/**
 * Generate a 6-category monthly budget allocation for a Vietnamese cafe.
 * Amounts are rounded to the nearest 100,000 VND. Percentages are integers
 * 0-100 summing to 100 ±2. Sum of amountVnd is within ±5% of totalVnd.
 */
export async function generateBudgetAllocation(args: {
  totalVnd: number;
  phase: BudgetPhase;
}): Promise<{ allocations: BudgetAllocation[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Budget allocator service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const { totalVnd, phase } = args;

  if (
    !Number.isFinite(totalVnd) ||
    totalVnd < BUDGET_TOTAL_MIN ||
    totalVnd > BUDGET_TOTAL_MAX
  ) {
    throw new Error(
      `Tổng ngân sách tháng phải trong khoảng ${BUDGET_TOTAL_MIN.toLocaleString(
        "vi-VN",
      )}-${BUDGET_TOTAL_MAX.toLocaleString("vi-VN")} VND`,
    );
  }
  if (phase !== "startup" && phase !== "growth" && phase !== "mature") {
    throw new Error("Giai đoạn phải là 'startup', 'growth' hoặc 'mature'");
  }

  const phaseDesc = PHASE_DESCRIPTIONS[phase];
  const categoriesJson = JSON.stringify(BUDGET_CATEGORIES);
  const totalRounded = Math.round(totalVnd / 100_000) * 100_000;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là cố vấn tài chính cho quán cà phê Việt Nam, hiểu cơ cấu chi phí " +
        "vận hành quán nhỏ tại Việt Nam (nguyên liệu, lương, tiện ích, marketing, " +
        "bảo trì, dự phòng) và biết điều chỉnh tỉ trọng theo giai đoạn vòng đời " +
        "của quán. CHỈ trả về JSON đúng cấu trúc — không markdown, không giải " +
        "thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy phân bổ tổng ngân sách tháng cho một quán cà phê Việt Nam.\n` +
        `- Tổng ngân sách: ${totalRounded} VND\n` +
        `- Giai đoạn: ${phase}. ${phaseDesc}\n` +
        `- 6 hạng mục bắt buộc (theo đúng thứ tự, GIỮ NGUYÊN tên): ${categoriesJson}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"allocations":[{"category":"<tên hạng mục, GIỮ NGUYÊN>","amountVnd":<số ` +
        `nguyên dương, LÀM TRÒN đến hàng 100.000 VND>,"pct":<số nguyên 0-100>,` +
        `"rationale":"<1 câu tiếng Việt 10-150 ký tự>"}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "allocations" phải có ĐÚNG 6 phần tử, theo đúng thứ tự danh sách trên.\n` +
        `- Tổng "amountVnd" phải ≈ ${totalRounded} VND (sai số ±5%).\n` +
        `- Tổng "pct" phải = 100 (sai số ±2).\n` +
        `- "amountVnd" làm tròn đến hàng 100.000, "pct" là số nguyên.\n` +
        `- "rationale" 10-150 ký tự tiếng Việt, nêu lý do tỉ trọng.\n` +
        `- Không markdown, không trường thừa, không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Budget allocator API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi phân bổ ngân sách rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi phân bổ ngân sách không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi phân bổ ngân sách không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.allocations;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi phân bổ ngân sách thiếu mảng 'allocations'");
  }
  if (rawList.length !== BUDGET_CATEGORIES.length) {
    throw new Error(
      `Cần đúng ${BUDGET_CATEGORIES.length} hạng mục, nhận được ${rawList.length}`,
    );
  }

  const seenCategories = new Set<BudgetCategory>();

  const allocations: BudgetAllocation[] = rawList.map(
    (entry, idx): BudgetAllocation => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`Hạng mục #${idx + 1} không hợp lệ`);
      }
      const rec = entry as Record<string, unknown>;

      const rawCat = typeof rec.category === "string" ? rec.category : "";
      const matched = CATEGORY_LOOKUP.get(normaliseCategory(rawCat));
      if (!matched) {
        throw new Error(
          `Hạng mục #${idx + 1} có tên không khớp: "${rawCat}"`,
        );
      }
      if (seenCategories.has(matched)) {
        throw new Error(`Hạng mục bị trùng: "${matched}"`);
      }
      seenCategories.add(matched);

      const rawAmt = rec.amountVnd;
      const amtNum =
        typeof rawAmt === "number"
          ? rawAmt
          : typeof rawAmt === "string"
            ? Number(rawAmt)
            : NaN;
      if (!Number.isFinite(amtNum) || amtNum <= 0) {
        throw new Error(
          `Hạng mục '${matched}' có 'amountVnd' không hợp lệ`,
        );
      }
      const amountVnd = Math.round(amtNum / 100_000) * 100_000;

      const rawPct = rec.pct;
      const pctNum =
        typeof rawPct === "number"
          ? rawPct
          : typeof rawPct === "string"
            ? Number(rawPct)
            : NaN;
      if (!Number.isFinite(pctNum) || pctNum < 0 || pctNum > 100) {
        throw new Error(
          `Hạng mục '${matched}' có 'pct' không hợp lệ (0-100)`,
        );
      }
      const pct = Math.round(pctNum);

      const rationale =
        typeof rec.rationale === "string" ? rec.rationale.trim() : "";
      if (rationale.length < 10 || rationale.length > 150) {
        throw new Error(
          `'rationale' của '${matched}' phải dài 10-150 ký tự (hiện ${rationale.length})`,
        );
      }

      return { category: matched, amountVnd, pct, rationale };
    },
  );

  if (seenCategories.size !== BUDGET_CATEGORIES.length) {
    throw new Error(
      `Cần đủ 6 hạng mục khác nhau, nhận được ${seenCategories.size}`,
    );
  }

  const totalAmt = allocations.reduce((acc, a) => acc + a.amountVnd, 0);
  const lowAmt = totalRounded * 0.95;
  const highAmt = totalRounded * 1.05;
  if (totalAmt < lowAmt || totalAmt > highAmt) {
    throw new Error(
      `Tổng phân bổ ${totalAmt} VND lệch quá 5% so với ngân sách ${totalRounded} VND`,
    );
  }

  const totalPct = allocations.reduce((acc, a) => acc + a.pct, 0);
  if (totalPct < 98 || totalPct > 102) {
    throw new Error(
      `Tổng phần trăm là ${totalPct}, phải nằm trong khoảng 98-102`,
    );
  }

  return { allocations };
}

export type SocialContentTone = "playful" | "premium" | "youthful";

export type SocialContentResult = {
  instagram: string;
  tiktok: string;
  facebook: string;
};

const SOCIAL_TONE_VI: Record<SocialContentTone, string> = {
  playful: "vui vẻ, hài hước, thân thiện",
  premium: "sang trọng, tinh tế, đẳng cấp",
  youthful: "trẻ trung, năng động, hợp Gen Z",
};

function stripWrappingQuotesSocial(s: string): string {
  let out = s.trim();
  // Repeatedly strip matching wrapping quotes (straight or curly).
  for (let i = 0; i < 3; i++) {
    if (out.length < 2) break;
    const first = out.charAt(0);
    const last = out.charAt(out.length - 1);
    const pairs: Array<[string, string]> = [
      ['"', '"'],
      ["'", "'"],
      ["\u201C", "\u201D"],
      ["\u2018", "\u2019"],
      ["`", "`"],
    ];
    let stripped = false;
    for (const [a, b] of pairs) {
      if (first === a && last === b) {
        out = out.slice(1, -1).trim();
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return out;
}

/**
 * Generate a 3-platform social media content set (Instagram caption,
 * TikTok hook, Facebook post) tailored for a Vietnamese cafe.
 * Used by /social-content admin tool.
 */
export async function generateSocialContent(args: {
  topic: string;
  tone: SocialContentTone;
}): Promise<SocialContentResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Social content service is not configured");
  }
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const topic = args.topic.trim();
  if (topic.length < 5 || topic.length > 200) {
    throw new Error("Chủ đề phải dài 5-200 ký tự");
  }
  const toneVi = SOCIAL_TONE_VI[args.tone];
  if (!toneVi) {
    throw new Error("Tông giọng không hợp lệ");
  }

  const messages = [
    {
      role: "system",
      content:
        "Bạn là copywriter mạng xã hội song ngữ Việt-Anh chuyên cho ngành " +
        "F&B (quán cà phê tại Việt Nam). Bạn nắm vững đặc trưng của từng " +
        "nền tảng: Instagram thiên về caption gọn gàng kèm hashtag, TikTok " +
        "cần một câu hook giật mình giữ chân người xem trong 3 giây đầu, " +
        "Facebook hợp với đoạn văn ngắn thân thiện kể chuyện. Văn phong " +
        "tự nhiên, có cảm xúc, có thể trộn nhẹ tiếng Anh phổ biến. CHỈ " +
        "trả về JSON đúng cấu trúc — không markdown, không tiền tố, không " +
        "giải thích.",
    },
    {
      role: "user",
      content:
        `Hãy viết bộ nội dung social media cho quán cà phê với chủ đề sau:\n` +
        `- Chủ đề: ${topic}\n` +
        `- Tông giọng yêu cầu: ${toneVi}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"instagram":"<caption>","tiktok":"<hook>","facebook":"<post>"}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "instagram": caption Instagram, TỐI ĐA 220 ký tự bao gồm 3-5 ` +
        `hashtag đặt ở cuối (ví dụ: #cafesaigon #specialtycoffee). Một ` +
        `đoạn duy nhất.\n` +
        `- "tiktok": ĐÚNG 1 câu hook ngắn TỐI ĐA 100 ký tự, giật mình, ` +
        `đặt câu hỏi hoặc gây tò mò để giữ người xem trong 3 giây đầu. ` +
        `Không hashtag, không emoji nhồi nhét.\n` +
        `- "facebook": post Facebook 1 đoạn văn thân thiện kể chuyện, ` +
        `TỐI ĐA 400 ký tự. Không markdown.\n` +
        `- Cả 3 trường đều BẮT BUỘC không rỗng.\n` +
        `- Không bọc giá trị trong dấu ngoặc kép thừa.\n` +
        `- Không markdown, không trailing comma, không thêm trường khác.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Social content API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi social content rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi social content không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi social content không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const instagram = stripWrappingQuotesSocial(
    typeof root.instagram === "string" ? root.instagram : "",
  );
  const tiktok = stripWrappingQuotesSocial(
    typeof root.tiktok === "string" ? root.tiktok : "",
  );
  const facebook = stripWrappingQuotesSocial(
    typeof root.facebook === "string" ? root.facebook : "",
  );

  if (instagram.length === 0) {
    throw new Error("'instagram' không được rỗng");
  }
  if (tiktok.length === 0) {
    throw new Error("'tiktok' không được rỗng");
  }
  if (facebook.length === 0) {
    throw new Error("'facebook' không được rỗng");
  }

  // Slack vs target lengths (220 / 100 / 400) — accept up to slack max.
  if (instagram.length > 280) {
    throw new Error(
      `'instagram' dài ${instagram.length} ký tự (tối đa 280)`,
    );
  }
  if (tiktok.length > 120) {
    throw new Error(`'tiktok' dài ${tiktok.length} ký tự (tối đa 120)`);
  }
  if (facebook.length > 480) {
    throw new Error(
      `'facebook' dài ${facebook.length} ký tự (tối đa 480)`,
    );
  }

  return { instagram, tiktok, facebook };
}

// ============================================================================
// Logo Concepts Generator
// ============================================================================

const LOGO_VIBE_DESCRIPTIONS: Record<string, string> = {
  cozy: "warm, inviting, hand-crafted",
  modern: "clean, minimal, contemporary geometric",
  luxe: "elegant, premium, gold-accented",
  playful: "fun, bright, cheerful cartoon-friendly",
  vintage: "retro, classic, distressed letterpress",
};

const LOGO_SYMBOL_DESCRIPTIONS: Record<string, string> = {
  "coffee-bean": "stylized coffee bean",
  cup: "stylized coffee cup or mug",
  leaf: "stylized leaf / botanical",
  abstract: "abstract geometric mark",
  "wordmark-only": "no icon, pure typography wordmark",
};

const LOGO_COMPOSITIONS = [
  "centered iconic mark",
  "horizontal lockup with wordmark",
  "badge-style emblem",
] as const;

export type LogoConcept = {
  url: string;
  promptHint: string;
};

export type LogoConceptsResult = {
  concepts: LogoConcept[];
};

export async function generateLogoConcepts(args: {
  cafeName: string;
  vibe: string;
  symbol: string;
}): Promise<LogoConceptsResult> {
  const cafeName = args.cafeName.trim();
  if (cafeName.length < 2 || cafeName.length > 30) {
    throw new Error("Tên quán phải từ 2 đến 30 ký tự.");
  }
  const vibeDesc = LOGO_VIBE_DESCRIPTIONS[args.vibe];
  if (!vibeDesc) throw new Error("Vibe không hợp lệ.");
  const symbolDesc = LOGO_SYMBOL_DESCRIPTIONS[args.symbol];
  if (!symbolDesc) throw new Error("Loại biểu tượng không hợp lệ.");

  const prompts = LOGO_COMPOSITIONS.map((composition) => ({
    composition,
    prompt:
      `Logo concept for cafe '${cafeName}', ${vibeDesc} vibe, ${symbolDesc} symbol, ` +
      `${composition}, on plain background, professional vector design, ` +
      `no real text other than the cafe name '${cafeName}', square 1:1, isolated, family-friendly`,
  }));

  const settled = await Promise.allSettled(
    prompts.map((p) => generateImage(p.prompt)),
  );

  const concepts: LogoConcept[] = [];
  settled.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value.url) {
      concepts.push({
        url: res.value.url,
        promptHint: prompts[i].composition,
      });
    }
  });

  if (concepts.length === 0) {
    throw new Error("Không sinh được logo nào. Vui lòng thử lại.");
  }

  return { concepts };
}


/**
 * Generate a cafe marketing poster image via xAI image API.
 * Wraps generateImage() with a structured prompt template.
 * Validates topic length (5-200) and returns the image URL.
 */
export async function generateCafePoster(args: {
  topic: string;
  style: string;
  colorMood: string;
}): Promise<{ url: string }> {
  const topic = args.topic.trim().replace(/\s+/g, " ");
  const style = args.style.trim();
  const colorMood = args.colorMood.trim();

  if (topic.length < 5) {
    throw new Error("Chủ đề poster cần ít nhất 5 ký tự.");
  }
  if (topic.length > 200) {
    throw new Error(
      `Chủ đề poster dài ${topic.length} ký tự (tối đa 200).`,
    );
  }
  if (!style) throw new Error("Thiếu phong cách poster.");
  if (!colorMood) throw new Error("Thiếu tông màu poster.");

  const prompt =
    `Cafe marketing poster, ${style} style, ${colorMood} color mood, ` +
    `theme: ${topic}, vertical composition with clear focal point and ` +
    `generous space at top for headline, no text in image, family-friendly, ` +
    `professional commercial photography illustration`;

  const result = await generateImage(prompt);
  return { url: result.url };
}


export type NewsletterTone = "playful" | "professional" | "warm";

export type NewsletterHighlight = {
  title: string;
  body: string;
};

export type NewsletterData = {
  greeting: string;
  intro: string;
  highlights: NewsletterHighlight[];
  ctaParagraph: string;
  ctaButton: string;
  signOff: string;
};

const NEWSLETTER_TONE_LABEL: Record<NewsletterTone, string> = {
  playful: "vui vẻ",
  professional: "chuyên nghiệp",
  warm: "ấm cúng",
};

/**
 * Generate a Vietnamese cafe weekly newsletter via xAI.
 *
 * Returns greeting + intro + EXACTLY 3 expanded highlights + CTA paragraph
 * + CTA button text + sign-off, all in Vietnamese, ready to be rendered into
 * Markdown or table-based email HTML by the caller.
 */
export async function generateNewsletter(args: {
  subject: string;
  highlights: string[];
  tone: NewsletterTone;
  cta: string;
}): Promise<NewsletterData> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Newsletter service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const subject = args.subject.trim();
  if (subject.length < 5 || subject.length > 100) {
    throw new Error("Tiêu đề bản tin phải có độ dài 5-100 ký tự.");
  }
  const cleanedHighlights = args.highlights
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (cleanedHighlights.length !== 3) {
    throw new Error("Cần đúng 3 ý chính cho bản tin.");
  }
  for (let i = 0; i < cleanedHighlights.length; i += 1) {
    const h = cleanedHighlights[i];
    if (h.length < 3 || h.length > 200) {
      throw new Error(`Ý chính #${i + 1} phải có độ dài 3-200 ký tự.`);
    }
  }
  const toneLabel = NEWSLETTER_TONE_LABEL[args.tone];
  if (!toneLabel) throw new Error("Tông giọng không hợp lệ.");
  const cta = args.cta.trim();
  if (cta.length > 50) {
    throw new Error("Lời kêu gọi hành động (CTA) tối đa 50 ký tự.");
  }

  const highlightLines = cleanedHighlights
    .map((h, i) => `  ${i + 1}. ${h}`)
    .join("\n");

  const ctaInstruction = cta.length > 0
    ? `Người dùng đã gợi ý CTA: "${cta}". Hãy lấy ý đó để soạn ` +
      `'ctaButton' (≤ 30 ký tự, có thể tinh chỉnh nhẹ) và 'ctaParagraph' ` +
      `(1-2 câu mời gọi hành động).`
    : `Hãy tự nghĩ ra một CTA phù hợp với chủ đề bản tin: ` +
      `'ctaButton' ≤ 30 ký tự, 'ctaParagraph' 1-2 câu mời gọi hành động.`;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là cây bút song ngữ Việt-Anh chuyên viết bản tin email hàng tuần " +
        "cho quán cà phê Việt Nam. Văn phong tự nhiên, ấm áp, chuyên nghiệp — " +
        "không sến, không sáo rỗng. Ưu tiên tiếng Việt; có thể đan xen vài " +
        "thuật ngữ tiếng Anh nếu phù hợp. CHỈ trả về JSON đúng cấu trúc — " +
        "không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy soạn nội dung bản tin email hàng tuần với:\n` +
        `- Tiêu đề: ${subject}\n` +
        `- Tông giọng: ${toneLabel}\n` +
        `- 3 ý chính cần khai triển:\n${highlightLines}\n\n` +
        `${ctaInstruction}\n\n` +
        `Trả về JSON đúng cấu trúc sau:\n` +
        `{"greeting":"<lời chào 1 câu>",` +
        `"intro":"<đoạn mở đầu khoảng 30 từ>",` +
        `"highlights":[{"title":"<tiêu đề ngắn>","body":"<khoảng 25 từ>"}],` +
        `"ctaParagraph":"<1-2 câu mời gọi>",` +
        `"ctaButton":"<text nút ≤ 30 ký tự>",` +
        `"signOff":"<lời chào kết 1 câu>"}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "highlights" phải có ĐÚNG 3 phần tử, theo thứ tự đã cho.\n` +
        `- Mỗi 'body' khoảng 20-35 từ, không quá 350 ký tự.\n` +
        `- 'intro' khoảng 25-40 từ, không quá 400 ký tự.\n` +
        `- 'greeting' và 'signOff' mỗi cái 1 câu, ≤ 120 ký tự.\n` +
        `- 'ctaButton' ≤ 30 ký tự, không xuống dòng.\n` +
        `- 'ctaParagraph' ≤ 250 ký tự.\n` +
        `- Tất cả viết bằng tiếng Việt tự nhiên theo tông giọng "${toneLabel}".\n` +
        `- Không thêm trường khác. Không markdown trong giá trị. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.75,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Newsletter API ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi bản tin rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi bản tin không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi bản tin không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;

  const pickStr = (key: string, max: number, label: string): string => {
    const v = root[key];
    if (typeof v !== "string") {
      throw new Error(`Bản tin thiếu trường '${key}' (${label})`);
    }
    const t = v.trim();
    if (!t) throw new Error(`Trường '${key}' (${label}) rỗng`);
    if (t.length > max) {
      throw new Error(
        `Trường '${key}' (${label}) quá dài (${t.length}/${max} ký tự)`,
      );
    }
    return t;
  };

  const greeting = pickStr("greeting", 200, "lời chào");
  const intro = pickStr("intro", 500, "đoạn mở đầu");
  const ctaParagraph = pickStr("ctaParagraph", 350, "đoạn CTA");
  const ctaButton = pickStr("ctaButton", 50, "nút CTA");
  const signOff = pickStr("signOff", 200, "lời chào kết");

  const rawHighlights = root.highlights;
  if (!Array.isArray(rawHighlights)) {
    throw new Error("Bản tin thiếu mảng 'highlights'");
  }
  if (rawHighlights.length !== 3) {
    throw new Error(
      `Cần đúng 3 highlights, nhận được ${rawHighlights.length}`,
    );
  }

  const highlights: NewsletterHighlight[] = rawHighlights.map(
    (item, idx): NewsletterHighlight => {
      if (!item || typeof item !== "object") {
        throw new Error(`Highlight ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;
      const title =
        typeof rec.title === "string" ? rec.title.trim() : "";
      const body = typeof rec.body === "string" ? rec.body.trim() : "";
      if (!title) throw new Error(`Highlight ${idx + 1} thiếu 'title'`);
      if (!body) throw new Error(`Highlight ${idx + 1} thiếu 'body'`);
      if (title.length > 120) {
        throw new Error(
          `Highlight ${idx + 1} có 'title' quá dài (${title.length}/120)`,
        );
      }
      if (body.length > 500) {
        throw new Error(
          `Highlight ${idx + 1} có 'body' quá dài (${body.length}/500)`,
        );
      }
      return { title, body };
    },
  );

  return {
    greeting,
    intro,
    highlights,
    ctaParagraph,
    ctaButton,
    signOff,
  };
}


// =============================================================================
// AI shift template suggester — suggest a 7-day rotation honouring per-role
// coverage targets per shift while balancing hours and giving days off.
// =============================================================================

export type ShiftTemplateShiftKey = "morning" | "afternoon" | "evening";
export type ShiftTemplateWeekday =
  | "T2"
  | "T3"
  | "T4"
  | "T5"
  | "T6"
  | "T7"
  | "CN";

export type ShiftTemplateDay = {
  weekday: ShiftTemplateWeekday;
  shifts: Record<ShiftTemplateShiftKey, number[]>;
};

export type ShiftTemplateResult = {
  template: ShiftTemplateDay[];
};

const SHIFT_TEMPLATE_WEEKDAYS: ReadonlyArray<ShiftTemplateWeekday> = [
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "CN",
];

const SHIFT_TEMPLATE_SHIFTS: ReadonlyArray<ShiftTemplateShiftKey> = [
  "morning",
  "afternoon",
  "evening",
];

const SHIFT_TEMPLATE_ROLE_LABEL: Record<string, string> = {
  barista: "Pha chế (barista)",
  server: "Phục vụ (server)",
  cashier: "Thu ngân (cashier)",
  manager: "Quản lý (manager)",
};

const SHIFT_TEMPLATE_SHIFT_LABEL: Record<ShiftTemplateShiftKey, string> = {
  morning: "Sáng",
  afternoon: "Chiều",
  evening: "Tối",
};

const SHIFT_TEMPLATE_MAX_DAYS = 5; // each employee at most 5 days/week

export async function generateShiftTemplate(args: {
  employees: Array<{ id: number; name: string; role: string }>;
  targets: Record<string, Record<string, number>>;
}): Promise<ShiftTemplateResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Shift template service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const employees = args.employees;
  if (!Array.isArray(employees) || employees.length === 0) {
    throw new Error("Cần có ít nhất một nhân viên để lập lịch");
  }

  const validIds = new Set<number>();
  for (const emp of employees) {
    if (
      !emp ||
      typeof emp.id !== "number" ||
      typeof emp.name !== "string" ||
      typeof emp.role !== "string"
    ) {
      throw new Error("Danh sách nhân viên không hợp lệ");
    }
    validIds.add(emp.id);
  }

  // Normalise targets: keep only known shifts, integer-clamp counts 0..10.
  const normalisedTargets: Record<
    ShiftTemplateShiftKey,
    Record<string, number>
  > = { morning: {}, afternoon: {}, evening: {} };

  let totalTarget = 0;
  for (const shift of SHIFT_TEMPLATE_SHIFTS) {
    const perRole = args.targets?.[shift] ?? {};
    for (const [role, raw] of Object.entries(perRole)) {
      const n = Math.max(0, Math.min(10, Math.floor(Number(raw) || 0)));
      if (n > 0) {
        normalisedTargets[shift][role] = n;
        totalTarget += n;
      }
    }
  }
  if (totalTarget === 0) {
    throw new Error("Hãy đặt ít nhất một mục tiêu nhân sự cho ca làm");
  }

  const employeesJson = JSON.stringify(
    employees.map((e) => ({ id: e.id, name: e.name, role: e.role })),
  );
  const targetsJson = JSON.stringify(normalisedTargets);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia xếp lịch ca làm cho quán cà phê Việt Nam. " +
        "Bạn lập lịch tuần 7 ngày (Thứ Hai đến Chủ Nhật) với 3 ca mỗi ngày: sáng, chiều, tối. " +
        "Bạn đảm bảo đủ số lượng theo từng vai trò (pha chế, phục vụ, thu ngân, quản lý), " +
        "phân bổ giờ làm công bằng và mỗi nhân viên có ít nhất 1 ngày nghỉ. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Danh sách nhân viên hiện có (JSON):\n${employeesJson}\n\n` +
        `Mục tiêu nhân sự cho từng ca (JSON, key là vai trò):\n${targetsJson}\n\n` +
        `Hãy lập lịch tuần và trả về JSON theo cấu trúc:\n` +
        `{"template":[{"weekday":"T2","shifts":{"morning":[<empId>,...],"afternoon":[...],"evening":[...]}}, ...]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "template" có ĐÚNG 7 phần tử, theo thứ tự: T2,T3,T4,T5,T6,T7,CN.\n` +
        `- Mỗi ngày có 3 ca: "morning","afternoon","evening" (mỗi ca là mảng id nhân viên).\n` +
        `- Tổng số nhân viên trong mỗi ca PHẢI khớp tổng các mục tiêu vai trò của ca đó.\n` +
        `- Mỗi vai trò trong ca phải có đủ số nhân viên theo mục tiêu (đếm theo "role").\n` +
        `- KHÔNG xếp một nhân viên 2 ca trong cùng một ngày.\n` +
        `- Mỗi nhân viên làm tối đa ${SHIFT_TEMPLATE_MAX_DAYS} ngày trong tuần (ít nhất 1 ngày nghỉ).\n` +
        `- Cân bằng số ca giữa các nhân viên cùng vai trò (chênh lệch tối đa 2 ca).\n` +
        `- Chỉ dùng id nhân viên trong danh sách trên. Không thêm trường khác.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Shift template API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi lịch tuần rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi lịch tuần không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi lịch tuần không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.template;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi lịch tuần thiếu mảng 'template'");
  }
  if (rawList.length !== 7) {
    throw new Error(`Cần đúng 7 ngày, nhận được ${rawList.length}`);
  }

  // Build lookup of role per employee id for role-target validation.
  const roleOfId = new Map<number, string>();
  for (const e of employees) roleOfId.set(e.id, e.role);

  const dayCount = new Map<number, number>();

  const template: ShiftTemplateDay[] = rawList.map(
    (item, idx): ShiftTemplateDay => {
      if (!item || typeof item !== "object") {
        throw new Error(`Ngày ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;
      const expectedWeekday = SHIFT_TEMPLATE_WEEKDAYS[idx];
      const weekday = typeof rec.weekday === "string" ? rec.weekday.trim() : "";
      if (weekday !== expectedWeekday) {
        throw new Error(
          `Ngày ${idx + 1} có 'weekday' = "${weekday}" (cần "${expectedWeekday}")`,
        );
      }

      const rawShifts = rec.shifts;
      if (!rawShifts || typeof rawShifts !== "object") {
        throw new Error(`Ngày ${expectedWeekday} thiếu 'shifts'`);
      }
      const shiftsRec = rawShifts as Record<string, unknown>;

      const shifts: Record<ShiftTemplateShiftKey, number[]> = {
        morning: [],
        afternoon: [],
        evening: [],
      };

      const seenInDay = new Set<number>();

      for (const shiftKey of SHIFT_TEMPLATE_SHIFTS) {
        const arr = shiftsRec[shiftKey];
        if (!Array.isArray(arr)) {
          throw new Error(
            `Ngày ${expectedWeekday} ca ${shiftKey} không phải mảng`,
          );
        }
        const normalisedIds: number[] = [];
        const seenInShift = new Set<number>();
        for (const v of arr) {
          const n = typeof v === "number" ? v : Number(v);
          if (!Number.isInteger(n) || !validIds.has(n)) {
            throw new Error(
              `Ngày ${expectedWeekday} ca ${shiftKey} chứa id nhân viên không hợp lệ: ${String(v)}`,
            );
          }
          if (seenInShift.has(n)) continue;
          seenInShift.add(n);
          if (seenInDay.has(n)) {
            throw new Error(
              `Nhân viên #${n} bị xếp 2 ca trong ngày ${expectedWeekday}`,
            );
          }
          seenInDay.add(n);
          normalisedIds.push(n);
          dayCount.set(n, (dayCount.get(n) ?? 0) + 1);
        }

        // Validate per-role coverage matches normalised target.
        const target = normalisedTargets[shiftKey];
        const actualByRole = new Map<string, number>();
        for (const id of normalisedIds) {
          const r = roleOfId.get(id) ?? "";
          actualByRole.set(r, (actualByRole.get(r) ?? 0) + 1);
        }
        for (const [role, want] of Object.entries(target)) {
          const got = actualByRole.get(role) ?? 0;
          if (got !== want) {
            const roleLabel = SHIFT_TEMPLATE_ROLE_LABEL[role] ?? role;
            const shiftLabel = SHIFT_TEMPLATE_SHIFT_LABEL[shiftKey];
            throw new Error(
              `${shiftLabel} ${expectedWeekday}: cần ${want} ${roleLabel}, AI xếp ${got}`,
            );
          }
        }

        shifts[shiftKey] = normalisedIds;
      }

      return { weekday: expectedWeekday, shifts };
    },
  );

  // Validate per-employee day cap.
  for (const [empId, count] of dayCount) {
    if (count > SHIFT_TEMPLATE_MAX_DAYS) {
      throw new Error(
        `Nhân viên #${empId} bị xếp ${count} ngày (tối đa ${SHIFT_TEMPLATE_MAX_DAYS})`,
      );
    }
  }

  return { template };
}

// ---------------------------------------------------------------------------
// KPI framework generator — produce a 5-KPI starter framework for a Vietnamese
// cafe based on its lifecycle stage (start-up / growth / mature) and 1-3
// business goals (revenue, staff retention, customer satisfaction, brand
// awareness, operational efficiency). Returns name, definition, target range,
// measurement frequency (whitelisted Vietnamese label) and "why it matters".
// ---------------------------------------------------------------------------

export type KpiStage = "startup" | "growth" | "mature";

export type KpiGoal =
  | "revenue"
  | "staff_retention"
  | "customer_satisfaction"
  | "brand_awareness"
  | "operational_efficiency";

export type KpiEntry = {
  name: string;
  definition: string;
  targetRange: string;
  frequency: string;
  whyItMatters: string;
};

export const KPI_FREQUENCIES = [
  "Hằng ngày",
  "Hằng tuần",
  "Hằng tháng",
  "Hằng quý",
] as const;

export type KpiFrequency = (typeof KPI_FREQUENCIES)[number];

const KPI_STAGE_DESCRIPTIONS_VI: Record<KpiStage, string> = {
  startup:
    "Khởi nghiệp (start-up): quán mới mở dưới 12 tháng, đang xây thương hiệu, " +
    "doanh thu chưa ổn định, ưu tiên thu hút khách lần đầu.",
  growth:
    "Tăng trưởng (growth): quán đã có khách quen, doanh thu tăng đều, đang " +
    "mở rộng tệp khách và quy trình vận hành.",
  mature:
    "Ổn định (mature): quán chạy ổn định nhiều năm, ưu tiên duy trì chất " +
    "lượng, tối ưu chi phí và giữ chân nhân viên/khách trung thành.",
};

const KPI_GOAL_LABELS_VI: Record<KpiGoal, string> = {
  revenue: "Doanh thu",
  staff_retention: "Giữ chân nhân viên",
  customer_satisfaction: "Hài lòng khách hàng",
  brand_awareness: "Nhận diện thương hiệu",
  operational_efficiency: "Hiệu quả vận hành",
};

function isKpiFrequency(s: string): s is KpiFrequency {
  return (KPI_FREQUENCIES as ReadonlyArray<string>).includes(s);
}

function kpiTrimString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Generate a 5-KPI framework for a Vietnamese cafe given a stage and 1-3
 * business goals. KPI names, definitions, target ranges and rationales are in
 * Vietnamese; frequency is one of the whitelisted Vietnamese cadence labels.
 */
export async function generateKpiFramework(args: {
  stage: string;
  goals: string[];
}): Promise<{ kpis: KpiEntry[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("KPI framework service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const stageRaw = args.stage;
  if (
    stageRaw !== "startup" &&
    stageRaw !== "growth" &&
    stageRaw !== "mature"
  ) {
    throw new Error("Giai đoạn phải là 'startup', 'growth' hoặc 'mature'");
  }
  const stage: KpiStage = stageRaw;

  if (
    !Array.isArray(args.goals) ||
    args.goals.length < 1 ||
    args.goals.length > 3
  ) {
    throw new Error("Phải chọn 1-3 mục tiêu kinh doanh");
  }
  const goals: KpiGoal[] = [];
  const seenGoal = new Set<KpiGoal>();
  for (const g of args.goals) {
    if (
      g !== "revenue" &&
      g !== "staff_retention" &&
      g !== "customer_satisfaction" &&
      g !== "brand_awareness" &&
      g !== "operational_efficiency"
    ) {
      throw new Error(`Mục tiêu không hợp lệ: '${g}'`);
    }
    if (seenGoal.has(g)) {
      throw new Error(`Mục tiêu bị trùng: '${g}'`);
    }
    seenGoal.add(g);
    goals.push(g);
  }

  const stageDesc = KPI_STAGE_DESCRIPTIONS_VI[stage];
  const goalsViList = goals.map((g) => KPI_GOAL_LABELS_VI[g]).join(", ");
  const frequenciesJson = JSON.stringify(KPI_FREQUENCIES);

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia chiến lược vận hành quán cà phê Việt Nam, song ngữ " +
        "Việt-Anh, am hiểu các chỉ số KPI thực dụng cho quán nhỏ tại Việt Nam " +
        "(doanh thu/tháng, AOV, tỉ lệ khách quay lại, NPS, tỉ lệ nghỉ việc, " +
        "tốc độ phục vụ, tỉ trọng chi phí nguyên liệu, follower mạng xã hội...). " +
        "Bạn biết đề xuất ngưỡng mục tiêu hợp lý theo giai đoạn vòng đời quán. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy đề xuất bộ KPI khởi đầu cho một quán cà phê Việt Nam.\n` +
        `- Giai đoạn: ${stage}. ${stageDesc}\n` +
        `- Mục tiêu kinh doanh ưu tiên: ${goalsViList}\n` +
        `- Tần suất đo lường BẮT BUỘC chọn 1 trong: ${frequenciesJson}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"kpis":[{"name":"<tên KPI tiếng Việt 5-50 ký tự>",` +
        `"definition":"<1 câu định nghĩa 10-200 ký tự>",` +
        `"targetRange":"<ngưỡng mục tiêu 3-50 ký tự, ví dụ '30-50tr VND/tháng' hoặc '4.5-5/5 sao'>",` +
        `"frequency":"<một trong: ${KPI_FREQUENCIES.join(" | ")}>",` +
        `"whyItMatters":"<1-2 câu lý do quan trọng 10-200 ký tự>"}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "kpis" phải có ĐÚNG 5 phần tử.\n` +
        `- Các KPI phải bám sát các mục tiêu đã chọn (ưu tiên các mục tiêu này, không lan man).\n` +
        `- Ngưỡng mục tiêu phải cụ thể, có đơn vị (VND, %, sao, người, phút...).\n` +
        `- Tần suất phải GIỮ NGUYÊN một trong các giá trị: ${KPI_FREQUENCIES.join(", ")}.\n` +
        `- Toàn bộ nội dung tiếng Việt tự nhiên, không markdown, không bullet, không trường thừa.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`KPI framework API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi bộ KPI rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi bộ KPI không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi bộ KPI không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.kpis;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi bộ KPI thiếu mảng 'kpis'");
  }
  if (rawList.length !== 5) {
    throw new Error(`Cần đúng 5 KPI, nhận được ${rawList.length}`);
  }

  const seenNames = new Set<string>();

  const kpis: KpiEntry[] = rawList.map((entry, idx): KpiEntry => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`KPI #${idx + 1} không hợp lệ`);
    }
    const rec = entry as Record<string, unknown>;

    const name = kpiTrimString(rec.name);
    if (name.length < 5 || name.length > 50) {
      throw new Error(
        `KPI #${idx + 1} có 'name' phải dài 5-50 ký tự (hiện ${name.length})`,
      );
    }
    const nameKey = name.toLowerCase();
    if (seenNames.has(nameKey)) {
      throw new Error(`KPI bị trùng tên: '${name}'`);
    }
    seenNames.add(nameKey);

    const definition = kpiTrimString(rec.definition);
    if (definition.length < 10 || definition.length > 200) {
      throw new Error(
        `KPI '${name}' có 'definition' phải dài 10-200 ký tự (hiện ${definition.length})`,
      );
    }

    const targetRange = kpiTrimString(rec.targetRange);
    if (targetRange.length < 3 || targetRange.length > 50) {
      throw new Error(
        `KPI '${name}' có 'targetRange' phải dài 3-50 ký tự (hiện ${targetRange.length})`,
      );
    }

    const frequency = kpiTrimString(rec.frequency);
    if (!isKpiFrequency(frequency)) {
      throw new Error(
        `KPI '${name}' có 'frequency' không hợp lệ: '${frequency}'`,
      );
    }

    const whyItMatters = kpiTrimString(rec.whyItMatters);
    if (whyItMatters.length < 10 || whyItMatters.length > 200) {
      throw new Error(
        `KPI '${name}' có 'whyItMatters' phải dài 10-200 ký tự (hiện ${whyItMatters.length})`,
      );
    }

    return { name, definition, targetRange, frequency, whyItMatters };
  });

  return { kpis };
}


// =====================================================================
// Mood board generator — 4 cohesive aesthetic images, parallel via xAI image API.
// =====================================================================

export type MoodBoardImage = {
  url: string;
  variant: string;
};

export type MoodBoardResult = {
  images: MoodBoardImage[];
};

const MOOD_BOARD_VARIANTS: ReadonlyArray<string> = [
  "cafe interior close-up detail",
  "table-top still life",
  "overhead flat-lay arrangement",
  "window light atmospheric scene",
];

export async function generateMoodBoard(args: {
  theme: string;
  keywords: string[];
}): Promise<MoodBoardResult> {
  const theme = args.theme.trim();
  if (!theme) throw new Error("Thiếu chủ đề aesthetic.");

  if (!Array.isArray(args.keywords)) {
    throw new Error("Từ khoá không hợp lệ.");
  }
  const keywords = args.keywords
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (keywords.length < 1 || keywords.length > 5) {
    throw new Error("Cần 1-5 từ khoá để dựng mood board.");
  }
  for (const k of keywords) {
    if (k.length < 2 || k.length > 30) {
      throw new Error(
        `Từ khoá '${k}' phải dài 2-30 ký tự (hiện ${k.length}).`,
      );
    }
  }

  const prompts = MOOD_BOARD_VARIANTS.map((variant) => ({
    variant,
    prompt:
      `Cafe mood board image, ${theme} aesthetic, featuring: ${keywords.join(", ")}, ` +
      `${variant}, no text, family-friendly, professional commercial photography style, square 1:1`,
  }));

  const settled = await Promise.allSettled(
    prompts.map((p) => generateImage(p.prompt)),
  );

  const images: MoodBoardImage[] = [];
  settled.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value.url) {
      images.push({
        url: res.value.url,
        variant: prompts[i].variant,
      });
    }
  });

  if (images.length === 0) {
    throw new Error("Không sinh được ảnh mood board nào. Vui lòng thử lại.");
  }

  return { images };
}

// =============================================================================
// Thank-you message generator — 3 personalized Vietnamese thank-you messages
// (short / medium / long) tailored to a customer context and channel.
// =============================================================================

export type ThankYouChannel = "sms" | "email" | "facebook-message";

export type ThankYouMessages = {
  short: string;
  medium: string;
  long: string;
};

type ThankYouChannelLimits = {
  short: number;
  medium: number;
  long: number;
};

const THANK_YOU_CHANNEL_LIMITS: Record<
  ThankYouChannel,
  ThankYouChannelLimits
> = {
  sms: { short: 80, medium: 150, long: 300 },
  email: { short: 120, medium: 250, long: 500 },
  "facebook-message": { short: 100, medium: 200, long: 350 },
};

const THANK_YOU_CHANNEL_LABEL: Record<ThankYouChannel, string> = {
  sms: "tin nhắn SMS (ngắn gọn, không emoji, không link dài)",
  email: "email (lịch sự, có thể có lời chào và ký tên 'Đội Cafe HR')",
  "facebook-message":
    "tin nhắn Facebook Messenger (thân thiện, có thể dùng tối đa 1 emoji nhẹ nhàng)",
};

const THANK_YOU_CONTEXT_LABEL: Record<string, string> = {
  "loyal-customer": "khách hàng thân thiết, thường xuyên ghé quán",
  "first-visit": "khách lần đầu ghé quán",
  "complaint-resolved":
    "khách vừa được xử lý khiếu nại — cần xin lỗi nhẹ và cảm ơn vì đã phản hồi",
  "large-group": "khách đặt nhóm đông người tại quán",
  "regular-order":
    "khách hay đặt một món quen (regular order) — cảm ơn vì sự ủng hộ ổn định",
};

function stripWrappingQuotesThankYou(s: string): string {
  return s
    .trim()
    .replace(/^["'“”‘’]+/, "")
    .replace(/["'“”‘’]+$/, "")
    .trim();
}

/**
 * Generate 3 Vietnamese thank-you messages of varying length (short / medium /
 * long) tailored to a cafe customer context and a specific channel. Lengths
 * are capped per channel; long includes a small offer/incentive.
 */
export async function generateThankYouMessages(args: {
  context: string;
  customerName: string;
  channel: ThankYouChannel;
}): Promise<{ messages: ThankYouMessages }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Thank-you service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const contextLabel = THANK_YOU_CONTEXT_LABEL[args.context];
  if (!contextLabel) throw new Error("Ngữ cảnh không hợp lệ.");

  const channelLabel = THANK_YOU_CHANNEL_LABEL[args.channel];
  if (!channelLabel) throw new Error("Kênh gửi không hợp lệ.");

  const customerName = args.customerName.trim();
  if (customerName.length > 60) {
    throw new Error("Tên khách quá dài (tối đa 60 ký tự).");
  }

  const limits = THANK_YOU_CHANNEL_LIMITS[args.channel];

  const greetingHint = customerName
    ? `Có thể nhắc tên khách "${customerName}" trong lời chào (ví dụ: "Chào ${customerName},").`
    : `Không có tên khách — dùng lời chào trung tính (ví dụ: "Chào bạn,").`;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên viên chăm sóc và quan hệ khách hàng song ngữ Việt-Anh cho một quán cà phê tại Việt Nam. " +
        "Bạn viết lời cảm ơn ấm áp, chân thành, đúng văn phong dịch vụ Việt Nam — không sáo rỗng, không cường điệu. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên. Không dùng markdown, không dùng dấu ngoặc kép bao quanh nội dung. " +
        "CHỈ trả về JSON đúng cấu trúc — không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy viết 3 lời cảm ơn bằng tiếng Việt cho một khách của quán cà phê, theo yêu cầu sau:\n\n` +
        `- Ngữ cảnh khách: ${contextLabel}\n` +
        `- Tên khách: ${customerName ? `"${customerName}"` : "(không có)"}\n` +
        `- Kênh gửi: ${channelLabel}\n\n` +
        `${greetingHint}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"messages":{"short":"<lời cảm ơn ngắn>","medium":"<lời cảm ơn vừa>","long":"<lời cảm ơn dài>"}}\n\n` +
        `Yêu cầu nghiêm ngặt về độ dài và nội dung:\n` +
        `- "short": 1-2 câu, tối đa ${limits.short} ký tự — lời cảm ơn cô đọng.\n` +
        `- "medium": 3-4 câu, tối đa ${limits.medium} ký tự — có lời chào, cảm ơn cụ thể, và lời chúc/mong gặp lại.\n` +
        `- "long": 5-6 câu, tối đa ${limits.long} ký tự — có lời chào, cảm ơn cụ thể theo ngữ cảnh, MỘT ưu đãi nhỏ (ví dụ: giảm 10% lần sau, tặng size up, freeship đơn tới) và lời chào kết.\n` +
        `- Phù hợp với kênh "${args.channel}": ${channelLabel}.\n` +
        `- Không lặp lại y hệt giữa 3 phiên bản.\n` +
        `- Không markdown, không bullet, không xuống dòng kép, không dấu ngoặc kép bao quanh.\n` +
        `- Mỗi giá trị là một chuỗi văn xuôi liền mạch (có thể có xuống dòng đơn nếu cần).`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Thank-you API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi lời cảm ơn rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi lời cảm ơn không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi lời cảm ơn không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawMessages = root.messages;
  if (!rawMessages || typeof rawMessages !== "object") {
    throw new Error("Phản hồi thiếu trường 'messages'");
  }

  const rec = rawMessages as Record<string, unknown>;
  const variants: ReadonlyArray<keyof ThankYouMessages> = [
    "short",
    "medium",
    "long",
  ];
  const variantLabels: Record<keyof ThankYouMessages, string> = {
    short: "ngắn",
    medium: "vừa",
    long: "dài",
  };

  const out: Partial<ThankYouMessages> = {};
  for (const v of variants) {
    const raw = rec[v];
    if (typeof raw !== "string") {
      throw new Error(`Lời cảm ơn ${variantLabels[v]} không phải chuỗi`);
    }
    const cleaned = stripWrappingQuotesThankYou(raw);
    if (cleaned.length === 0) {
      throw new Error(`Lời cảm ơn ${variantLabels[v]} bị rỗng`);
    }
    if (cleaned.length > limits[v]) {
      throw new Error(
        `Lời cảm ơn ${variantLabels[v]} dài ${cleaned.length} ký tự (tối đa ${limits[v]} cho kênh ${args.channel})`,
      );
    }
    out[v] = cleaned;
  }

  return {
    messages: {
      short: out.short as string,
      medium: out.medium as string,
      long: out.long as string,
    },
  };
}

// =============================================================================
// Storefront mockup generator — single horizontal exterior cafe mockup image.
// =============================================================================

const STOREFRONT_STYLE_DESC: Record<string, string> = {
  "modern-glass": "floor-to-ceiling glass with brushed metal accents",
  "cozy-rustic": "reclaimed wood panels and warm exposed brick",
  "industrial-loft": "raw concrete, black steel framing and Edison bulbs",
  "vintage-french": "pastel shutters, wrought iron details and classic awnings",
  "minimalist-zen": "clean lines, neutral palette, light wood and stone",
  "tropical-bamboo": "natural bamboo, woven rattan and lush tropical plants",
};

const STOREFRONT_FACADE_DESC: Record<string, string> = {
  "corner-shop": "corner shop with two visible street-facing sides",
  "street-front": "narrow street-front shophouse with single facade",
  "inside-mall": "in-mall storefront with open-plan glass entrance",
  "standalone-villa": "standalone garden villa with surrounding yard",
};

const STOREFRONT_EMPHASIZE_DESC: Record<string, string> = {
  signage: "a prominent illuminated cafe signage above the entrance",
  windows: "large showcase windows with carefully styled displays",
  "outdoor-seating": "an inviting outdoor seating area with tables and chairs",
  greenery: "abundant greenery, planters and climbing vines around the facade",
};

export async function generateStorefrontMockup(args: {
  cafeName: string;
  style: string;
  facadeType: string;
  emphasize: string;
}): Promise<{ url: string }> {
  const cafeName = args.cafeName.trim();
  if (cafeName.length < 2 || cafeName.length > 30) {
    throw new Error(
      `Tên quán phải dài 2-30 ký tự (hiện ${cafeName.length}).`,
    );
  }

  const styleDesc = STOREFRONT_STYLE_DESC[args.style];
  if (!styleDesc) throw new Error("Phong cách không hợp lệ.");

  const facadeTypeDesc = STOREFRONT_FACADE_DESC[args.facadeType];
  if (!facadeTypeDesc) throw new Error("Kiểu mặt tiền không hợp lệ.");

  const emphasizeDesc = STOREFRONT_EMPHASIZE_DESC[args.emphasize];
  if (!emphasizeDesc) throw new Error("Yếu tố nhấn mạnh không hợp lệ.");

  const prompt =
    `Architectural mockup of a Vietnamese cafe storefront for '${cafeName}', ` +
    `${styleDesc} style, ${facadeTypeDesc} facade, emphasizing ${emphasizeDesc}, ` +
    `daytime golden hour lighting, no people, professional commercial illustration, ` +
    `no text in image, horizontal 16:9 framing, family-friendly, photorealistic`;

  const result = await generateImage(prompt);
  if (!result.url) {
    throw new Error("Không sinh được ảnh mockup mặt tiền. Vui lòng thử lại.");
  }
  return { url: result.url };
}


/**
 * Generate an Instagram square (1:1) image for cafe content.
 * Wraps generateImage() with a structured prompt.
 * Validates topic length (5-200) and returns the image URL.
 */
export async function generateIgPost(args: {
  topic: string;
  vibe: string;
}): Promise<{ url: string }> {
  const topic = args.topic.trim().replace(/\s+/g, " ");
  const vibe = args.vibe.trim();

  if (topic.length < 5) {
    throw new Error("Chủ đề IG post cần ít nhất 5 ký tự.");
  }
  if (topic.length > 200) {
    throw new Error(
      `Chủ đề IG post dài ${topic.length} ký tự (tối đa 200).`,
    );
  }
  if (!vibe) throw new Error("Thiếu vibe của IG post.");

  const vibeDescMap: Record<string, string> = {
    cozy: "warm and cozy",
    vibrant: "bright and vibrant",
    minimal: "clean and minimal",
    nostalgic: "soft and nostalgic",
  };
  const vibeDesc = vibeDescMap[vibe] || vibe;

  const prompt =
    `Instagram square photo for cafe content, ${vibeDesc} vibe, ` +
    `theme: ${topic}, eye-catching composition with leading focal point, ` +
    `generous negative space for text overlay, no text in image, ` +
    `family-friendly, professional food / lifestyle photography style, ` +
    `square 1:1`;

  const result = await generateImage(prompt);
  return { url: result.url };
}

// =============================================================================
// Staff uniform design generator — 3 angle-variant uniform concept images.
// Generates "front view full body", "detail close-up of apron and accessories",
// and "three-quarter side view" in parallel via Promise.allSettled.
// =============================================================================

const UNIFORM_ROLE_DESC: Record<string, string> = {
  barista: "barista (espresso bar, latte art station)",
  server: "server (floor staff, table service)",
  cashier: "cashier (front counter, POS)",
  manager: "shift manager (lead, supervising staff)",
};

const UNIFORM_STYLE_DESC: Record<string, string> = {
  "smart-casual": "smart-casual: tailored shirt with chinos and a clean apron",
  "classic-formal":
    "classic-formal: crisp button-up, dark trousers and a long bistro apron",
  streetwear:
    "streetwear: relaxed graphic tee, cap, sneakers and a cross-back canvas apron",
  vintage:
    "vintage: 1950s-inspired diner shirt with bowtie and short waist apron",
  athleisure:
    "athleisure: breathable performance polo with stretch joggers and minimalist apron",
};

const UNIFORM_ANGLES: ReadonlyArray<string> = [
  "front-view full body",
  "detail close-up of apron and accessories",
  "three-quarter side view",
];

export type UniformConcept = {
  url: string;
  angle: string;
};

export type UniformConceptsResult = {
  concepts: UniformConcept[];
};

export async function generateUniformConcepts(args: {
  role: string;
  style: string;
  dominantColor: string;
}): Promise<UniformConceptsResult> {
  const roleDesc = UNIFORM_ROLE_DESC[args.role];
  if (!roleDesc) throw new Error("Vai trò không hợp lệ.");

  const styleDesc = UNIFORM_STYLE_DESC[args.style];
  if (!styleDesc) throw new Error("Phong cách không hợp lệ.");

  const dominantColor = args.dominantColor.trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(dominantColor)) {
    throw new Error("Mã màu chủ đạo phải dạng #RRGGBB.");
  }

  const prompts = UNIFORM_ANGLES.map((angle) => ({
    angle,
    prompt:
      `Cafe staff uniform design for a ${roleDesc}, ${styleDesc} style, ` +
      `${dominantColor} dominant color palette, ${angle}, on plain neutral background, ` +
      `professional fashion illustration style, no real face details, family-friendly`,
  }));

  const settled = await Promise.allSettled(
    prompts.map((p) => generateImage(p.prompt)),
  );

  const concepts: UniformConcept[] = [];
  settled.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value.url) {
      concepts.push({
        url: res.value.url,
        angle: prompts[i].angle,
      });
    }
  });

  if (concepts.length === 0) {
    throw new Error(
      "Không sinh được concept đồng phục nào. Vui lòng thử lại.",
    );
  }

  return { concepts };
}

/**
 * Generate AI seasonal decor concept images for 4 cafe placement areas.
 * Reuses generateImage() per placement and runs all in parallel via
 * Promise.allSettled. Throws if zero placements succeed.
 */
const SEASONAL_DECOR_PLACEMENTS = [
  "entrance archway and door area",
  "interior accent wall",
  "table-top centerpiece arrangement",
  "window display facing street",
] as const;

const SEASONAL_DECOR_SEASON_DESCRIPTIONS: Record<string, string> = {
  xuan: "spring",
  ha: "summer",
  thu: "autumn",
  dong: "winter",
};

const SEASONAL_DECOR_HOLIDAY_DESCRIPTIONS: Record<string, string> = {
  tet: "Vietnamese Lunar New Year with red and gold lanterns and peach blossoms",
  "mid-autumn":
    "Vietnamese Mid-Autumn Festival with mooncakes lanterns and lotus motifs",
  christmas:
    "Christmas with pine wreaths warm fairy lights red and green ornaments",
  valentines:
    "Valentine's Day with soft pink and red hearts roses and warm candlelight",
  "black-friday":
    "Black Friday sale event with bold black and gold signage modern minimalist",
  "no-holiday":
    "everyday seasonal ambience without specific holiday motifs",
};

export type SeasonalDecorConcept = {
  url: string;
  placement: string;
};

export type SeasonalDecorResult = {
  concepts: SeasonalDecorConcept[];
};

export async function generateSeasonalDecor(args: {
  season: string;
  holiday: string;
}): Promise<SeasonalDecorResult> {
  const seasonDesc = SEASONAL_DECOR_SEASON_DESCRIPTIONS[args.season];
  if (!seasonDesc) throw new Error("Mùa không hợp lệ.");
  const holidayDesc = SEASONAL_DECOR_HOLIDAY_DESCRIPTIONS[args.holiday];
  if (!holidayDesc) throw new Error("Bối cảnh lễ hội không hợp lệ.");

  const prompts = SEASONAL_DECOR_PLACEMENTS.map((placement) => ({
    placement,
    prompt:
      `Cafe seasonal decor concept, ${seasonDesc} season, ${holidayDesc} theme, ` +
      `${placement}, no text, no people, family-friendly, ` +
      `professional commercial photography style, square 1:1`,
  }));

  const settled = await Promise.allSettled(
    prompts.map((p) => generateImage(p.prompt)),
  );

  const concepts: SeasonalDecorConcept[] = [];
  settled.forEach((res, i) => {
    if (res.status === "fulfilled" && res.value.url) {
      concepts.push({
        url: res.value.url,
        placement: prompts[i].placement,
      });
    }
  });

  if (concepts.length === 0) {
    throw new Error(
      "Không sinh được concept trang trí nào. Vui lòng thử lại.",
    );
  }

  return { concepts };
}

// =============================================================================
// Menu item illustration generator — single styled illustration per call.
// Wraps generateImage() with a per-style prompt template.
// =============================================================================

const MENU_ILLUSTRATION_STYLE_DESC: Record<string, string> = {
  photo:
    "professional food photography, soft natural lighting, top-down angle",
  watercolor:
    "delicate watercolor illustration with hand-painted texture",
  "flat-vector":
    "clean flat-vector illustration with simple shapes and limited palette",
  "3d-render":
    "stylized 3D render with soft shadows and warm color palette",
};

export const MENU_ILLUSTRATION_STYLES: ReadonlyArray<string> = [
  "photo",
  "watercolor",
  "flat-vector",
  "3d-render",
];

export async function generateMenuIllustration(args: {
  itemName: string;
  description: string;
  style: string;
}): Promise<{ url: string }> {
  const itemName = args.itemName.trim().replace(/\s+/g, " ");
  const description = args.description.trim().replace(/\s+/g, " ");

  if (itemName.length < 2 || itemName.length > 60) {
    throw new Error("Tên món phải dài 2-60 ký tự.");
  }
  if (description.length < 5 || description.length > 200) {
    throw new Error("Mô tả phải dài 5-200 ký tự.");
  }

  const styleDescriptor = MENU_ILLUSTRATION_STYLE_DESC[args.style];
  if (!styleDescriptor) {
    throw new Error("Phong cách minh họa không hợp lệ.");
  }

  const prompt =
    `${styleDescriptor}, subject: ${itemName} — ${description}, ` +
    `on a clean cafe-table background, no text, family-friendly, ` +
    `square 1:1, isolated focal point`;

  const result = await generateImage(prompt);
  return { url: result.url };
}

// =============================================================================
// Weekly feedback compiler — turns 7 days of customer + user feedback facts
// into a 3-section Vietnamese report (themes / positives / concerns).
// =============================================================================

export type CompiledFeedbackReport = {
  themes: string[];
  positives: string[];
  concerns: string[];
};

function parseFeedbackBulletArray(raw: unknown, field: string): string[] {
  if (!Array.isArray(raw) || raw.length !== 3) {
    throw new Error(`Trường '${field}' cần đúng 3 phần tử`);
  }
  return raw.map((item, idx): string => {
    const s = typeof item === "string" ? item.trim() : "";
    if (!s) throw new Error(`'${field}' phần tử ${idx + 1} rỗng`);
    if (s.length < 5 || s.length > 150) {
      throw new Error(
        `'${field}' phần tử ${idx + 1} dài ${s.length} ký tự (cần 5-150)`,
      );
    }
    return s;
  });
}

export async function compileFeedbackReport(
  facts: FeedbackFacts,
): Promise<CompiledFeedbackReport> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Feedback compiler service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const factsPayload = {
    windowStart: facts.windowStart.toISOString(),
    windowEnd: facts.windowEnd.toISOString(),
    customerCount: facts.customerCount,
    userCount: facts.userCount,
    avgRating: facts.avgRating,
    byCategory: facts.byCategory,
    sampleMessages: facts.sampleMessages,
  };

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên viên phân tích vận hành cho một quán cà phê Việt Nam. Giọng văn thực tế, hữu ích, không sáo rỗng. Luôn trả lời JSON hợp lệ, không markdown.",
    },
    {
      role: "user",
      content:
        `Dưới đây là dữ liệu phản hồi 7 ngày qua (JSON):\n${JSON.stringify(factsPayload)}\n\n` +
        `Hãy đọc dữ liệu (số liệu + sample tin nhắn) rồi trả về JSON dạng:\n` +
        `{"themes": [3 string], "positives": [3 string], "concerns": [3 string]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "themes": 3 chủ đề nổi bật xuất hiện trong phản hồi (cả khách lẫn nhân viên).\n` +
        `- "positives": 3 điểm tích cực cụ thể đáng giữ.\n` +
        `- "concerns": 3 vấn đề cần lưu ý / cải thiện.\n` +
        `- Mỗi mảng đúng 3 phần tử, mỗi câu tiếng Việt 5-150 ký tự, không rỗng, không trùng lặp.\n` +
        `- Bám sát số liệu và tin nhắn, không bịa. Nếu dữ liệu mỏng, ghi rõ "dữ liệu hạn chế".\n` +
        `- Không markdown, không bullet ký tự, không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Feedback compiler API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi tổng hợp rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi tổng hợp không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi tổng hợp không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const themes = parseFeedbackBulletArray(root.themes, "themes");
  const positives = parseFeedbackBulletArray(root.positives, "positives");
  const concerns = parseFeedbackBulletArray(root.concerns, "concerns");

  return { themes, positives, concerns };
}

// =============================================================================
// Drink-pastry pairing recommender — given a drink name + customer mood,
// returns 3 food/snack/pastry pairings each with a short reasoning + price tier.
// =============================================================================

export type PairingMood = "relax" | "work-focus" | "social" | "quick-takeaway";
export type PairingPriceTier = "budget" | "mid" | "premium";

export type DrinkPairing = {
  name: string;
  reasoning: string;
  priceTier: PairingPriceTier;
};

const PAIRING_MOOD_LABEL: Record<PairingMood, string> = {
  relax: "thư giãn",
  "work-focus": "tập trung",
  social: "giao lưu",
  "quick-takeaway": "mua mang về",
};

const PAIRING_PRICE_TIERS: ReadonlySet<PairingPriceTier> = new Set<PairingPriceTier>(
  ["budget", "mid", "premium"],
);

function isPairingPriceTier(v: unknown): v is PairingPriceTier {
  return typeof v === "string" && PAIRING_PRICE_TIERS.has(v as PairingPriceTier);
}

export async function generatePairings(args: {
  drinkName: string;
  mood: string;
}): Promise<{ pairings: DrinkPairing[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Pairing service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const drinkName = args.drinkName.trim();
  if (drinkName.length < 2 || drinkName.length > 60) {
    throw new Error("Tên đồ uống cần 2-60 ký tự");
  }
  const moodKey = args.mood as PairingMood;
  const moodLabel = PAIRING_MOOD_LABEL[moodKey];
  if (!moodLabel) throw new Error("Tâm trạng khách không hợp lệ");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia kết hợp đồ uống và đồ ăn (sommelier) cho các quán cà phê Việt Nam, " +
        "có kinh nghiệm thực tế về khẩu vị, kết cấu và bối cảnh thưởng thức. " +
        "Bạn am hiểu các loại bánh ngọt, bánh mặn, snack phổ biến tại Việt Nam và quốc tế, " +
        "biết cân đối giá tiền theo phân khúc bình dân / trung cấp / cao cấp. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy gợi ý 3 món ăn / bánh / snack đi kèm phù hợp với:\n` +
        `- Đồ uống: "${drinkName}"\n` +
        `- Tâm trạng / bối cảnh khách: ${moodLabel}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"pairings":[{"name":"<tên món, 2-50 ký tự>",` +
        `"reasoning":"<1 câu giải thích vì sao kết hợp tốt, 10-150 ký tự>",` +
        `"priceTier":"budget" | "mid" | "premium"}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- Mảng "pairings" phải có ĐÚNG 3 phần tử, không trùng lặp.\n` +
        `- "name" 2-50 ký tự, "reasoning" 10-150 ký tự (đúng 1 câu tiếng Việt tự nhiên).\n` +
        `- "priceTier" CHỈ nhận đúng 1 trong 3 giá trị: "budget", "mid", "premium".\n` +
        `- Không thêm trường khác. Không markdown. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Pairing API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi gợi ý kèm rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi gợi ý kèm không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi gợi ý kèm không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.pairings;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi gợi ý kèm thiếu mảng 'pairings'");
  }
  if (rawList.length !== 3) {
    throw new Error(`Cần đúng 3 gợi ý, nhận được ${rawList.length}`);
  }

  const seen = new Set<string>();
  const pairings: DrinkPairing[] = rawList.map((item, idx): DrinkPairing => {
    if (!item || typeof item !== "object") {
      throw new Error(`Gợi ý ${idx + 1} không hợp lệ`);
    }
    const rec = item as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    const reasoning =
      typeof rec.reasoning === "string" ? rec.reasoning.trim() : "";
    if (name.length < 2 || name.length > 50) {
      throw new Error(
        `Gợi ý ${idx + 1} có 'name' dài ${name.length} ký tự (cần 2-50)`,
      );
    }
    if (reasoning.length < 10 || reasoning.length > 150) {
      throw new Error(
        `Gợi ý ${idx + 1} có 'reasoning' dài ${reasoning.length} ký tự (cần 10-150)`,
      );
    }
    if (!isPairingPriceTier(rec.priceTier)) {
      throw new Error(
        `Gợi ý ${idx + 1} có 'priceTier' không hợp lệ (cần budget/mid/premium)`,
      );
    }
    const dedupKey = name.toLowerCase();
    if (seen.has(dedupKey)) {
      throw new Error(`Gợi ý ${idx + 1} trùng tên với món trước`);
    }
    seen.add(dedupKey);

    return { name, reasoning, priceTier: rec.priceTier };
  });

  return { pairings };
}

/* ------------------------------------------------------------------ */
/* Greeting card generator                                            */
/* ------------------------------------------------------------------ */

const GREETING_OCCASION_VN: Record<string, string> = {
  tet: "Tết Nguyên Đán",
  "mid-autumn": "Trung Thu",
  christmas: "Giáng Sinh",
  valentines: "Valentine",
  "new-year": "Năm Mới",
  birthday: "Sinh Nhật",
  "general-thanks": "Cảm Ơn",
};

const GREETING_OCCASION_IMG: Record<string, string> = {
  tet: "Vietnamese Lunar New Year (Tet) with peach blossoms, apricot blossoms, red envelopes and golden lanterns",
  "mid-autumn":
    "Vietnamese Mid-Autumn Festival with full moon, mooncakes, lotus and warm lanterns",
  christmas:
    "Christmas with pine branches, soft snow, golden ornaments and warm candle light",
  valentines:
    "Valentine's day with soft roses, gentle hearts and warm rose-pink palette",
  "new-year":
    "New Year celebration with soft fireworks, golden sparkles and elegant champagne tones",
  birthday:
    "Birthday celebration with soft confetti, a small frosted cake and warm pastel ribbons",
  "general-thanks":
    "Heartfelt thank-you scene with warm coffee cups, soft kraft paper and gentle florals",
};

const GREETING_TONE_VN: Record<string, string> = {
  warm: "ấm áp, chân thành, gần gũi",
  formal: "trang trọng, lịch thiệp, chuyên nghiệp",
  playful: "vui tươi, nhẹ nhàng, hóm hỉnh nhưng tinh tế",
};

const GREETING_TONE_IMG: Record<string, string> = {
  warm: "warm, cozy, heartfelt",
  formal: "elegant, refined, professional",
  playful: "cheerful, lively, lighthearted",
};

/**
 * Generate a short Vietnamese greeting message (~30-40 words) tailored to an
 * occasion, optional recipient name, and tone. Returns plain text without
 * wrapping quotes.
 */
export async function generateGreetingMessage(args: {
  occasion: string;
  recipientName: string;
  tone: string;
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Greeting service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const occasionVn = GREETING_OCCASION_VN[args.occasion];
  if (!occasionVn) throw new Error("Dịp không hợp lệ");
  const toneVn = GREETING_TONE_VN[args.tone];
  if (!toneVn) throw new Error("Giọng văn không hợp lệ");

  const recipient = args.recipientName.trim();
  const salutationHint =
    recipient.length > 0
      ? `Hãy mở đầu bằng cách xưng hô tự nhiên với "${recipient}" (ví dụ: "Gửi ${recipient},").`
      : "Không cần xưng hô tên cụ thể, có thể dùng cách gọi chung như anh/chị/quý khách.";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là cây bút thương hiệu cho một quán cà phê Việt Nam, chuyên viết lời chúc ngắn gọn, " +
        "ấm áp và đậm chất văn hoá Việt. Luôn trả lời bằng tiếng Việt tự nhiên, không markdown, " +
        "không bullet, không emoji, không dấu ngoặc kép quanh câu.",
    },
    {
      role: "user",
      content:
        `Hãy viết một lời chúc nhân dịp ${occasionVn} với giọng văn ${toneVn}. ` +
        `${salutationHint} ` +
        "Yêu cầu: khoảng 30-40 từ, viết liền mạch 1-2 câu, phù hợp để in trên thiệp, " +
        "tránh sến và tránh sáo rỗng. Chỉ trả về đúng nội dung lời chúc, không lời dẫn, " +
        "không giải thích, không dấu ngoặc kép.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.85,
      max_tokens: 300,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Greeting API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung lời chúc");
  content = content.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  return { content };
}

/**
 * Generate a themed greeting card background image using the existing
 * generateImage() endpoint. The image deliberately leaves space at the
 * center for a CSS text overlay and contains no embedded text.
 */
export async function generateGreetingImage(args: {
  occasion: string;
  tone: string;
}): Promise<{ url: string }> {
  const occasionDesc = GREETING_OCCASION_IMG[args.occasion];
  if (!occasionDesc) throw new Error("Dịp không hợp lệ");
  const toneDesc = GREETING_TONE_IMG[args.tone];
  if (!toneDesc) throw new Error("Giọng văn không hợp lệ");

  const prompt =
    `Greeting card background image, ${occasionDesc} theme, ${toneDesc} mood, ` +
    "soft warm composition with generous space at center for text overlay, " +
    "no text in image, family-friendly, professional commercial illustration style, square 1:1";

  const result = await generateImage(prompt);
  return { url: result.url };
}

/* ------------------------------------------------------------------ */
/* Vietnamese blog post generator                                     */
/* ------------------------------------------------------------------ */

export type BlogPostSection = {
  heading: string;
  body: string;
};

export type BlogPostData = {
  title: string;
  intro: string;
  sections: BlogPostSection[];
  cta: string | null;
  tags: string[];
};

const BLOG_POST_AUDIENCE_VN: Record<string, string> = {
  general: "khách đại chúng yêu thích cà phê",
  "coffee-enthusiast": "người đam mê cà phê (coffee enthusiast) muốn hiểu sâu",
  "cafe-owner": "chủ quán cà phê đang vận hành kinh doanh",
  "barista-trainee": "học viên barista mới vào nghề",
};

const BLOG_POST_LENGTH_VN: Record<
  string,
  { label: string; words: number; range: string }
> = {
  short: { label: "ngắn", words: 300, range: "270-330" },
  medium: { label: "vừa", words: 500, range: "460-540" },
  long: { label: "dài", words: 800, range: "740-860" },
};

/**
 * Generate a Vietnamese blog post for a Vietnamese cafe brand. Returns a
 * structured object with title, intro, exactly 3 body sections, an optional
 * CTA, and 3-5 suggested tags. Validates lengths client-side after parsing.
 */
export async function generateBlogPost(args: {
  topic: string;
  audience: string;
  length: string;
  includeCta: boolean;
}): Promise<BlogPostData> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Blog post service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const topic = args.topic.trim();
  if (topic.length < 5 || topic.length > 200) {
    throw new Error("Chủ đề phải có độ dài 5-200 ký tự.");
  }
  const audienceVn = BLOG_POST_AUDIENCE_VN[args.audience];
  if (!audienceVn) throw new Error("Đối tượng độc giả không hợp lệ.");
  const lengthSpec = BLOG_POST_LENGTH_VN[args.length];
  if (!lengthSpec) throw new Error("Độ dài bài viết không hợp lệ.");

  const ctaInstruction = args.includeCta
    ? `- Trường "cta": viết MỘT đoạn kêu gọi hành động (CTA) bằng tiếng Việt, ` +
      `khoảng 1-2 câu, dài 30-200 ký tự, mời độc giả ghé quán/đặt bàn/thử món/tham gia khoá học.`
    : `- Trường "cta": phải để giá trị null (không phải chuỗi rỗng).`;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là cây bút song ngữ Việt-Anh chuyên viết nội dung blog cho thương hiệu " +
        "quán cà phê Việt Nam. Văn phong tự nhiên, chuyên nghiệp, có chiều sâu — không " +
        "sến, không sáo rỗng, không lặp ý. Ưu tiên tiếng Việt; có thể đan xen vài " +
        "thuật ngữ tiếng Anh chuyên ngành cà phê khi phù hợp. CHỈ trả về JSON đúng " +
        "cấu trúc — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy viết một bài blog tiếng Việt với:\n` +
        `- Chủ đề: ${topic}\n` +
        `- Đối tượng độc giả: ${audienceVn}\n` +
        `- Độ dài tổng thể: ${lengthSpec.label} (mục tiêu khoảng ${lengthSpec.words} từ, ` +
        `nằm trong khoảng ${lengthSpec.range} từ cho toàn bộ phần intro + sections + cta).\n\n` +
        `Trả về JSON đúng cấu trúc sau:\n` +
        `{"title":"<tiêu đề ~60 ký tự>",` +
        `"intro":"<đoạn mở đầu 1 paragraph>",` +
        `"sections":[{"heading":"<tiêu đề mục>","body":"<2 paragraphs ngăn cách bằng \\n\\n>"}],` +
        `"cta":<chuỗi hoặc null>,` +
        `"tags":["<tag1>","<tag2>","<tag3>"]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "title" 10-100 ký tự, mục tiêu ~60 ký tự, hấp dẫn và đúng chủ đề.\n` +
        `- "intro" 50-300 ký tự, đúng MỘT paragraph, không xuống dòng.\n` +
        `- "sections" phải có ĐÚNG 3 phần tử, mỗi phần tử có "heading" 5-80 ký tự ` +
        `và "body" 100-800 ký tự gồm 2 paragraphs ngăn cách bằng "\\n\\n".\n` +
        `${ctaInstruction}\n` +
        `- "tags" mảng 3-5 chuỗi, mỗi tag 2-30 ký tự, ngắn gọn, không dấu # ở đầu.\n` +
        `- Tổng số từ tiếng Việt của intro + sections.body + cta nên gần ${lengthSpec.words} từ.\n` +
        `- Toàn bộ viết bằng tiếng Việt tự nhiên, phù hợp với "${audienceVn}".\n` +
        `- Không thêm trường khác. Không markdown trong giá trị. Không trailing comma.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Blog post API ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi bài blog rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Phản hồi bài blog không phải JSON hợp lệ");
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi bài blog không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;

  const pickStr = (
    key: string,
    min: number,
    max: number,
    label: string,
  ): string => {
    const v = root[key];
    if (typeof v !== "string") {
      throw new Error(`Bài blog thiếu trường '${key}' (${label})`);
    }
    const t = v.trim();
    if (t.length < min) {
      throw new Error(
        `Trường '${key}' (${label}) quá ngắn (${t.length}/${min} ký tự)`,
      );
    }
    if (t.length > max) {
      throw new Error(
        `Trường '${key}' (${label}) quá dài (${t.length}/${max} ký tự)`,
      );
    }
    return t;
  };

  const title = pickStr("title", 10, 100, "tiêu đề");
  const intro = pickStr("intro", 50, 300, "đoạn mở đầu");

  const rawSections = root.sections;
  if (!Array.isArray(rawSections)) {
    throw new Error("Bài blog thiếu mảng 'sections'");
  }
  if (rawSections.length !== 3) {
    throw new Error(
      `Cần đúng 3 sections, nhận được ${rawSections.length}`,
    );
  }

  const sections: BlogPostSection[] = rawSections.map(
    (item, idx): BlogPostSection => {
      if (!item || typeof item !== "object") {
        throw new Error(`Section ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;
      const heading =
        typeof rec.heading === "string" ? rec.heading.trim() : "";
      const body = typeof rec.body === "string" ? rec.body.trim() : "";
      if (heading.length < 5 || heading.length > 80) {
        throw new Error(
          `Section ${idx + 1} có 'heading' dài ${heading.length} ký tự (cần 5-80)`,
        );
      }
      if (body.length < 100 || body.length > 800) {
        throw new Error(
          `Section ${idx + 1} có 'body' dài ${body.length} ký tự (cần 100-800)`,
        );
      }
      return { heading, body };
    },
  );

  let cta: string | null = null;
  const rawCta = root.cta;
  if (args.includeCta) {
    if (typeof rawCta !== "string") {
      throw new Error("Bài blog thiếu trường 'cta' (đoạn kêu gọi hành động)");
    }
    const t = rawCta.trim();
    if (t.length < 30 || t.length > 200) {
      throw new Error(
        `Trường 'cta' dài ${t.length} ký tự (cần 30-200)`,
      );
    }
    cta = t;
  } else if (rawCta !== null && rawCta !== undefined) {
    // Tolerate the model returning empty string when CTA was disabled.
    if (typeof rawCta === "string" && rawCta.trim().length === 0) {
      cta = null;
    } else {
      cta = null;
    }
  }

  const rawTags = root.tags;
  if (!Array.isArray(rawTags)) {
    throw new Error("Bài blog thiếu mảng 'tags'");
  }
  if (rawTags.length < 3 || rawTags.length > 5) {
    throw new Error(
      `Cần 3-5 tags, nhận được ${rawTags.length}`,
    );
  }
  const tags: string[] = [];
  const seenTag = new Set<string>();
  for (let i = 0; i < rawTags.length; i += 1) {
    const raw = rawTags[i];
    if (typeof raw !== "string") {
      throw new Error(`Tag ${i + 1} không phải chuỗi`);
    }
    const t = raw.trim().replace(/^#+/, "").trim();
    if (t.length < 2 || t.length > 30) {
      throw new Error(
        `Tag ${i + 1} dài ${t.length} ký tự (cần 2-30)`,
      );
    }
    const dedupKey = t.toLowerCase();
    if (seenTag.has(dedupKey)) {
      throw new Error(`Tag ${i + 1} ('${t}') trùng với tag trước`);
    }
    seenTag.add(dedupKey);
    tags.push(t);
  }

  return { title, intro, sections, cta, tags };
}

/* ------------------------------------------------------------------ */
/* Customer FAQ generator                                             */
/* ------------------------------------------------------------------ */

export type FaqFormality = "formal" | "friendly";

export type FaqItem = {
  question: string;
  answer: string;
};

const FAQ_FORMALITY_VN: Record<FaqFormality, string> = {
  formal: "trang trọng",
  friendly: "thân thiện",
};

/**
 * Generate exactly 10 Vietnamese customer FAQ Q&A pairs about the given
 * cafe topic. Returns strictly validated entries (Q 5-100, A 10-250 chars).
 */
export async function generateFaq(args: {
  topic: string;
  formality: FaqFormality;
}): Promise<{ items: FaqItem[] }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("FAQ service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const topic = args.topic.trim();
  if (topic.length < 5 || topic.length > 200) {
    throw new Error("Chủ đề cần 5-200 ký tự");
  }
  const formalityVn = FAQ_FORMALITY_VN[args.formality];
  if (!formalityVn) throw new Error("Giọng văn không hợp lệ");

  const formalityHint =
    args.formality === "formal"
      ? "xưng hô lịch sự, dùng 'quý khách', 'chúng tôi'"
      : "gần gũi, ấm áp, dùng 'bạn', 'mình'";

  const messages = [
    {
      role: "system",
      content:
        "You are a knowledgeable bilingual Vietnamese-English customer service writer for " +
        "a Vietnamese cafe. You craft clear, concise FAQ entries that answer real customer " +
        "questions about menu, ordering, reservations, payments, loyalty, and operations. " +
        "Always write the FAQ output in natural Vietnamese. Each question must be a real " +
        "question a customer would ask (not a statement). Each answer must be specific, " +
        "actionable, and avoid filler words. ONLY return valid JSON in the exact structure " +
        "requested. No markdown, no commentary, no preface.",
    },
    {
      role: "user",
      content:
        `Hãy viết EXACTLY 10 câu hỏi thường gặp của khách hàng (FAQ) cho quán cà phê Việt Nam ` +
        `về chủ đề: "${topic}". Giọng văn ${formalityVn} (${formalityHint}).\n\n` +
        `Yêu cầu chặt chẽ:\n` +
        `- Mỗi câu hỏi (question): tối đa 100 ký tự, ít nhất 5 ký tự, kết thúc bằng dấu '?'.\n` +
        `- Mỗi câu trả lời (answer): tối đa 250 ký tự, ít nhất 10 ký tự, đầy đủ thông tin, không sáo rỗng.\n` +
        `- Không trùng lặp ý, mỗi câu hỏi khai thác một góc khác nhau của chủ đề.\n` +
        `- Tất cả viết bằng tiếng Việt tự nhiên, không markdown, không emoji.\n\n` +
        `Trả về JSON đúng định dạng sau (không thêm trường, không markdown, không trailing comma):\n` +
        `{"items":[{"question":"...","answer":"..."}, ... đúng 10 phần tử ...]}`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FAQ API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi FAQ rỗng");

  const items = parseFaqPayload(content);
  return { items };
}

function parseFaqPayload(content: string): FaqItem[] {
  const tryParse = (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  let parsed: unknown = tryParse(content);
  if (parsed === null) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi FAQ không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawList = root.items;
  if (!Array.isArray(rawList)) {
    throw new Error("Phản hồi FAQ thiếu mảng 'items'");
  }
  if (rawList.length !== 10) {
    throw new Error(`Cần đúng 10 mục FAQ, nhận được ${rawList.length}`);
  }

  const seen = new Set<string>();
  return rawList.map((item, idx): FaqItem => {
    if (!item || typeof item !== "object") {
      throw new Error(`Mục FAQ ${idx + 1} không hợp lệ`);
    }
    const rec = item as Record<string, unknown>;
    const question =
      typeof rec.question === "string" ? rec.question.trim() : "";
    const answer = typeof rec.answer === "string" ? rec.answer.trim() : "";
    if (question.length < 5 || question.length > 100) {
      throw new Error(
        `Câu hỏi ${idx + 1} dài ${question.length} ký tự (cần 5-100)`,
      );
    }
    if (answer.length < 10 || answer.length > 250) {
      throw new Error(
        `Câu trả lời ${idx + 1} dài ${answer.length} ký tự (cần 10-250)`,
      );
    }
    const dedupKey = question.toLowerCase();
    if (seen.has(dedupKey)) {
      throw new Error(`Câu hỏi ${idx + 1} trùng với câu hỏi trước`);
    }
    seen.add(dedupKey);
    return { question, answer };
  });
}

/* ------------------------------------------------------------------ */
/* Vietnamese cafe podcast script generator                           */
/* ------------------------------------------------------------------ */

export type PodcastScriptSegment = {
  title: string;
  body: string;
};

export type PodcastScriptData = {
  intro: string;
  segments: PodcastScriptSegment[];
  outro: string;
};

const PODCAST_DURATION_VN: Record<
  string,
  { label: string; wordsPerSegment: number; minutes: number }
> = {
  "5-min": { label: "khoảng 5 phút", wordsPerSegment: 200, minutes: 5 },
  "10-min": { label: "khoảng 10 phút", wordsPerSegment: 400, minutes: 10 },
  "20-min": { label: "khoảng 20 phút", wordsPerSegment: 700, minutes: 20 },
};

const PODCAST_STYLE_VN: Record<string, string> = {
  interview:
    "phỏng vấn (host hỏi giả định, sau đó chính host tự kể lại câu trả lời như một monologue có chiều sâu, tự nhiên)",
  monologue:
    "monologue (host độc thoại, kể chuyện và chia sẻ cảm xúc cá nhân, văn phong gần gũi)",
  "story-driven":
    "story-driven (kể chuyện theo dòng thời gian/nhân vật, có cao trào và bài học rút ra)",
};

export async function generatePodcastScript(args: {
  topic: string;
  duration: string;
  style: string;
  hostName: string;
}): Promise<PodcastScriptData> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Podcast script service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const topic = args.topic.trim();
  if (topic.length < 5 || topic.length > 200) {
    throw new Error("Chủ đề phải có độ dài 5-200 ký tự.");
  }

  const durationSpec = PODCAST_DURATION_VN[args.duration];
  if (!durationSpec) throw new Error("Thời lượng không hợp lệ.");

  const styleVn = PODCAST_STYLE_VN[args.style];
  if (!styleVn) throw new Error("Phong cách không hợp lệ.");

  const hostName = args.hostName.trim();
  if (hostName.length > 60) {
    throw new Error("Tên host tối đa 60 ký tự.");
  }
  const hostLine = hostName
    ? `Tên host (người dẫn): ${hostName}. Khi giới thiệu hoặc tạm biệt có thể nhắc đến tên này một cách tự nhiên.`
    : "Host không có tên cụ thể — không được tự bịa tên, chỉ xưng 'mình' hoặc 'tôi' một cách tự nhiên.";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là biên kịch podcast tiếng Việt cho một thương hiệu quán cà phê. " +
        "Văn phong ấm áp, trò chuyện, có chiều sâu, không sến, không sáo rỗng, " +
        "không lặp ý. Lời thoại phải dễ đọc thành tiếng (read-aloud friendly), " +
        "không markdown, không emoji, không tiêu đề lồng nhau bên trong nội dung. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích thêm.",
    },
    {
      role: "user",
      content:
        `Hãy viết kịch bản podcast tiếng Việt cho quán cà phê với:\n` +
        `- Chủ đề: ${topic}\n` +
        `- Thời lượng: ${durationSpec.label} (~${durationSpec.minutes} phút khi đọc)\n` +
        `- Phong cách: ${styleVn}\n` +
        `- ${hostLine}\n\n` +
        `Trả về JSON đúng cấu trúc sau, không thêm trường khác:\n` +
        `{"intro":"<đoạn mở đầu hook ~30 giây khi đọc>",` +
        `"segments":[{"title":"<tiêu đề phần>","body":"<host monologue cho phần này>"}],` +
        `"outro":"<đoạn kết kèm CTA mời nghe lại / ghé quán / đăng ký>"}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "intro" 50-300 ký tự, là một hook hấp dẫn ~30 giây khi đọc thành tiếng, ` +
        `không xuống dòng quá nhiều, không tiêu đề.\n` +
        `- "segments" phải có ĐÚNG 3 phần tử. Mỗi phần tử có:\n` +
        `  + "title" 5-80 ký tự, ngắn gọn, gợi tò mò.\n` +
        `  + "body" 100-1500 ký tự, là host monologue thuần (không ký hiệu phát biểu kiểu "Host:"), ` +
        `mục tiêu khoảng ${durationSpec.wordsPerSegment} từ tiếng Việt cho phần này.\n` +
        `- "outro" 30-200 ký tự, kết bài kèm CTA tự nhiên (mời nghe tập sau, ghé quán, ` +
        `theo dõi, hoặc chia sẻ).\n` +
        `- Toàn bộ bằng tiếng Việt tự nhiên, phù hợp đọc thành tiếng. ` +
        `Không markdown, không emoji, không trailing comma, không thêm trường khác.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.75,
      max_tokens: 3500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Podcast script API ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi kịch bản podcast rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi kịch bản podcast không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi kịch bản podcast không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;

  const pickStr = (
    key: string,
    min: number,
    max: number,
    label: string,
  ): string => {
    const v = root[key];
    if (typeof v !== "string") {
      throw new Error(`Kịch bản thiếu trường '${key}' (${label})`);
    }
    const t = v.trim();
    if (t.length < min) {
      throw new Error(
        `Trường '${key}' (${label}) quá ngắn (${t.length}/${min} ký tự)`,
      );
    }
    if (t.length > max) {
      throw new Error(
        `Trường '${key}' (${label}) quá dài (${t.length}/${max} ký tự)`,
      );
    }
    return t;
  };

  const intro = pickStr("intro", 50, 300, "đoạn mở đầu");
  const outro = pickStr("outro", 30, 200, "đoạn kết");

  const rawSegments = root.segments;
  if (!Array.isArray(rawSegments)) {
    throw new Error("Kịch bản thiếu mảng 'segments'");
  }
  if (rawSegments.length !== 3) {
    throw new Error(`Cần đúng 3 segments, nhận được ${rawSegments.length}`);
  }

  const segments: PodcastScriptSegment[] = rawSegments.map(
    (item, idx): PodcastScriptSegment => {
      if (!item || typeof item !== "object") {
        throw new Error(`Segment ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;
      const title = typeof rec.title === "string" ? rec.title.trim() : "";
      const body = typeof rec.body === "string" ? rec.body.trim() : "";
      if (title.length < 5 || title.length > 80) {
        throw new Error(
          `Segment ${idx + 1} có 'title' dài ${title.length} ký tự (cần 5-80)`,
        );
      }
      if (body.length < 100 || body.length > 1500) {
        throw new Error(
          `Segment ${idx + 1} có 'body' dài ${body.length} ký tự (cần 100-1500)`,
        );
      }
      return { title, body };
    },
  );

  return { intro, segments, outro };
}

// ============================================================================
// Storyboard generator (short-form video for cafe — TikTok / Reels)
// ============================================================================

export type StoryboardFrame = {
  number: number;
  shot: string;
  voiceover: string;
  durationSec: number;
};

export type StoryboardData = {
  frames: StoryboardFrame[];
  totalSec: number;
};

const STORYBOARD_DURATION_VN: Record<
  string,
  { label: string; targetSec: number; perFrameAvg: number }
> = {
  "15-sec": { label: "15 giây", targetSec: 15, perFrameAvg: 2.5 },
  "30-sec": { label: "30 giây", targetSec: 30, perFrameAvg: 5 },
  "60-sec": { label: "60 giây", targetSec: 60, perFrameAvg: 10 },
};

const STORYBOARD_STYLE_VN: Record<string, string> = {
  storytelling:
    "kể chuyện (storytelling: có mở-thân-kết, có nhân vật hoặc khoảnh khắc cảm xúc, dẫn dắt mạch lạc)",
  "product-focus":
    "tập trung sản phẩm (product-focus: highlight đồ uống/món ăn, cận cảnh kết cấu, hơi nóng, rót, trang trí)",
  "behind-the-scenes":
    "hậu trường (behind-the-scenes: quy trình pha chế, nhân viên làm việc, không khí quán, chân thực)",
  "customer-testimonial":
    "khách hàng chia sẻ (customer-testimonial: phản hồi/câu nói của khách, phản ứng thật, cảm xúc tích cực)",
};

export async function generateStoryboard(args: {
  concept: string;
  duration: string;
  style: string;
}): Promise<StoryboardData> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Storyboard service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const concept = args.concept.trim();
  if (concept.length < 5 || concept.length > 200) {
    throw new Error("Ý tưởng phải có độ dài 5-200 ký tự.");
  }

  const durationSpec = STORYBOARD_DURATION_VN[args.duration];
  if (!durationSpec) throw new Error("Thời lượng không hợp lệ.");

  const styleVn = STORYBOARD_STYLE_VN[args.style];
  if (!styleVn) throw new Error("Phong cách không hợp lệ.");

  const messages = [
    {
      role: "system",
      content:
        "Bạn là nhà sản xuất video tiếng Việt cho thương hiệu quán cà phê, " +
        "chuyên về video ngắn dạng dọc trên TikTok và Reels. Bạn hiểu rõ " +
        "ngôn ngữ hình ảnh: cận cảnh, slow-motion, B-roll, transition mềm, " +
        "ánh sáng ấm. Văn phong gợi hình, súc tích, không sến, không sáo rỗng. " +
        "CHỈ trả về JSON đúng cấu trúc — không markdown, không giải thích.",
    },
    {
      role: "user",
      content:
        `Hãy tạo storyboard cho video ngắn dọc của quán cà phê với:\n` +
        `- Ý tưởng / concept: ${concept}\n` +
        `- Tổng thời lượng mục tiêu: ${durationSpec.label} (${durationSpec.targetSec} giây)\n` +
        `- Phong cách: ${styleVn}\n\n` +
        `Trả về JSON đúng cấu trúc sau, không thêm trường khác:\n` +
        `{"frames":[{"number":1,"shot":"<mô tả cảnh quay>","voiceover":"<lời thoại/voiceover>","durationSec":3}]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "frames" phải có ĐÚNG 6 phần tử, theo thứ tự kể chuyện hợp lý.\n` +
        `- "number" là số nguyên 1..6, lần lượt 1,2,3,4,5,6.\n` +
        `- "shot" 10-200 ký tự tiếng Việt, mô tả CẢNH QUAY (góc máy, chủ thể, hành động) ` +
        `trong 1-2 câu. Không lời thoại trong trường này.\n` +
        `- "voiceover" 5-100 ký tự tiếng Việt, là MỘT câu ngắn voiceover hoặc on-screen text. ` +
        `Không markdown, không emoji.\n` +
        `- "durationSec" là số nguyên 1..30 giây cho khung hình đó. ` +
        `Tổng durationSec của 6 khung phải sát mục tiêu ${durationSpec.targetSec} giây ` +
        `(±20%, tức trong khoảng ${Math.round(durationSpec.targetSec * 0.8)}-${Math.round(durationSpec.targetSec * 1.2)} giây). ` +
        `Mục tiêu trung bình ~${durationSpec.perFrameAvg} giây/khung.\n` +
        `- Toàn bộ tiếng Việt tự nhiên, không markdown, không trailing comma, ` +
        `không thêm trường nào khác.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Storyboard API ${res.status}: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi storyboard rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi storyboard không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi storyboard không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const rawFrames = root.frames;
  if (!Array.isArray(rawFrames)) {
    throw new Error("Storyboard thiếu mảng 'frames'");
  }
  if (rawFrames.length !== 6) {
    throw new Error(`Cần đúng 6 khung hình, nhận được ${rawFrames.length}`);
  }

  const frames: StoryboardFrame[] = rawFrames.map(
    (item, idx): StoryboardFrame => {
      if (!item || typeof item !== "object") {
        throw new Error(`Khung ${idx + 1} không hợp lệ`);
      }
      const rec = item as Record<string, unknown>;

      const rawNumber = rec.number;
      const numberVal =
        typeof rawNumber === "number"
          ? rawNumber
          : typeof rawNumber === "string"
            ? Number.parseInt(rawNumber, 10)
            : NaN;
      if (!Number.isInteger(numberVal) || numberVal !== idx + 1) {
        throw new Error(
          `Khung ${idx + 1} có 'number' không hợp lệ (mong đợi ${idx + 1})`,
        );
      }

      const shot = typeof rec.shot === "string" ? rec.shot.trim() : "";
      if (shot.length < 10 || shot.length > 200) {
        throw new Error(
          `Khung ${idx + 1} có 'shot' dài ${shot.length} ký tự (cần 10-200)`,
        );
      }

      const voiceover =
        typeof rec.voiceover === "string" ? rec.voiceover.trim() : "";
      if (voiceover.length < 5 || voiceover.length > 100) {
        throw new Error(
          `Khung ${idx + 1} có 'voiceover' dài ${voiceover.length} ký tự (cần 5-100)`,
        );
      }

      const rawDur = rec.durationSec;
      const durationSec =
        typeof rawDur === "number"
          ? rawDur
          : typeof rawDur === "string"
            ? Number.parseInt(rawDur, 10)
            : NaN;
      if (
        !Number.isInteger(durationSec) ||
        durationSec < 1 ||
        durationSec > 30
      ) {
        throw new Error(
          `Khung ${idx + 1} có 'durationSec' không hợp lệ (cần số nguyên 1-30)`,
        );
      }

      return { number: numberVal, shot, voiceover, durationSec };
    },
  );

  const totalSec = frames.reduce((sum, f) => sum + f.durationSec, 0);
  const minTotal = Math.round(durationSpec.targetSec * 0.8);
  const maxTotal = Math.round(durationSpec.targetSec * 1.2);
  if (totalSec < minTotal || totalSec > maxTotal) {
    throw new Error(
      `Tổng thời lượng ${totalSec}s không nằm trong khoảng cho phép ${minTotal}-${maxTotal}s ` +
        `(mục tiêu ${durationSpec.targetSec}s ±20%)`,
    );
  }

  return { frames, totalSec };
}

const PWA_ICON_STYLE_DESCRIPTIONS: Record<string, string> = {
  modern: "modern minimalist geometric",
  vintage: "vintage retro hand-crafted",
  playful: "playful rounded friendly",
  luxe: "luxe elegant gold-accented refined",
};

export const PWA_ICON_STYLE_VALUES: ReadonlyArray<string> = Object.keys(
  PWA_ICON_STYLE_DESCRIPTIONS,
);

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Generate a square branded PWA app icon (~512px) suitable for the manifest.
 * Wraps generateImage() with a structured monogram-icon prompt template.
 */
export async function generatePwaIcon(args: {
  initial: string;
  style: string;
  backgroundColor: string;
}): Promise<{ url: string }> {
  const initial = args.initial.trim();
  if (initial.length < 1 || initial.length > 3) {
    throw new Error("Initial phải có 1 đến 3 ký tự.");
  }
  const styleDesc = PWA_ICON_STYLE_DESCRIPTIONS[args.style];
  if (!styleDesc) {
    throw new Error("Style không hợp lệ.");
  }
  const backgroundColor = args.backgroundColor.trim();
  if (!HEX_COLOR_PATTERN.test(backgroundColor)) {
    throw new Error("Màu nền phải ở dạng hex 6 ký tự, ví dụ #6f4e37.");
  }

  const prompt =
    `App icon design: bold ${initial} letter monogram on ${backgroundColor} solid background, ` +
    `${styleDesc} style, centered composition with generous padding, no text other than the letter, ` +
    `family-friendly, square 1:1, professional vector design, high contrast, suitable for mobile app icon`;

  const result = await generateImage(prompt);
  return { url: result.url };
}

const COACHING_FOCUS_VN: Record<string, string> = {
  "skill-development": "phát triển kỹ năng",
  "customer-service": "phục vụ khách",
  "time-management": "quản lý thời gian",
  teamwork: "làm việc nhóm",
  motivation: "tạo động lực",
};

/**
 * Generate a personalized ~80-word Vietnamese coaching tip for a single
 * cafe employee, addressed by name and tailored to their role and the
 * chosen focus area. Returns plain prose (no markdown, no quotes).
 */
export async function generateCoachingTip(args: {
  employeeName: string;
  role: string;
  focus: string;
}): Promise<{ content: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Coaching service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const focusVn = COACHING_FOCUS_VN[args.focus];
  if (!focusVn) throw new Error("Lĩnh vực coaching không hợp lệ");

  const employeeName = args.employeeName.trim();
  if (!employeeName) throw new Error("Tên nhân viên không hợp lệ");
  const role = args.role.trim() || "nhân viên";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là head trainer (huấn luyện viên trưởng) của một quán cà phê Việt Nam, " +
        "giàu kinh nghiệm mentoring nhân viên ở mọi vị trí. Giọng văn ấm áp, khích lệ, " +
        "đồng hành; lời khuyên luôn cụ thể, có thể hành động ngay trong ca làm. " +
        "Luôn trả lời bằng tiếng Việt tự nhiên, xưng hô thân mật phù hợp đồng nghiệp. " +
        "Không markdown, không bullet, không emoji, không dấu ngoặc kép quanh đoạn văn, " +
        "không lời dẫn kiểu \"Đây là lời khuyên...\".",
    },
    {
      role: "user",
      content:
        `Hãy viết một lời khuyên coaching dành riêng cho nhân viên tên ${employeeName}, ` +
        `đang làm vị trí ${role} tại quán cà phê. ` +
        `Chủ đề trọng tâm: ${focusVn}. ` +
        "Yêu cầu: gọi tên nhân viên ít nhất một lần ở đầu đoạn (ví dụ: \"" +
        employeeName +
        " ơi, ...\"); nội dung phù hợp với đặc thù công việc của vị trí này; " +
        "đưa ra 2-3 hành động cụ thể có thể thử ngay trong ca làm sắp tới; " +
        "kết thúc bằng một câu khích lệ ngắn. " +
        "Độ dài khoảng 80 từ (tối thiểu 70, tối đa 95 từ), viết liền mạch thành 1 đoạn văn, " +
        "không xuống dòng, không bullet, không markdown, không dấu ngoặc kép.",
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.8,
      max_tokens: 400,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Coaching API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  let content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Không nhận được nội dung lời khuyên");
  content = content.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
  return { content };
}

// =============================================================================
// AI ad banner generator — landscape 1.91:1 banner image for paid ads.
// Wraps generateImage() with a structured prompt template, leaving the right
// side as negative space so the CSS overlay can render the offer headline.
// =============================================================================

const AD_BANNER_STYLE_DESC: Record<string, string> = {
  modern: "modern, clean, contemporary commercial",
  vibrant: "bold, vibrant, high-saturation, energetic",
  minimalist: "minimalist, refined, lots of negative space, subtle palette",
  luxury: "luxurious, premium, refined dark tones with gold-warm highlights",
};

const AD_BANNER_PLATFORM_DESC: Record<string, string> = {
  facebook: "Facebook feed",
  google: "Google Display Network",
  instagram: "Instagram landscape feed",
};

export async function generateAdBanner(args: {
  theme: string;
  style: string;
  platform: string;
}): Promise<{ url: string }> {
  const theme = args.theme.trim().replace(/\s+/g, " ");
  if (theme.length < 5) {
    throw new Error("Chủ đề ad banner cần ít nhất 5 ký tự.");
  }
  if (theme.length > 200) {
    throw new Error(
      `Chủ đề ad banner dài ${theme.length} ký tự (tối đa 200).`,
    );
  }

  const styleDesc = AD_BANNER_STYLE_DESC[args.style];
  if (!styleDesc) throw new Error("Phong cách không hợp lệ.");

  const platformDesc = AD_BANNER_PLATFORM_DESC[args.platform];
  if (!platformDesc) throw new Error("Nền tảng quảng cáo không hợp lệ.");

  const prompt =
    `Ad banner image for ${platformDesc} advertising, ${styleDesc} style, ` +
    `theme: ${theme}, horizontal 1.91:1 composition optimized for ad display, ` +
    `eye-catching focal point with generous negative space on right for ` +
    `headline text overlay, no text in image, family-friendly, professional ` +
    `commercial photography style`;

  const result = await generateImage(prompt);
  if (!result.url) {
    throw new Error("Không sinh được ad banner. Vui lòng thử lại.");
  }
  return { url: result.url };
}

// =============================================================================
// AI value proposition canvas — generates a Strategyzer-style canvas with a
// customer profile (jobs/pains/gains) and a value map (products/pain
// relievers/gain creators) tuned for the Vietnamese cafe market.
// =============================================================================

export type ValuePropositionCanvas = {
  customerProfile: {
    jobs: string[];
    pains: string[];
    gains: string[];
  };
  valueMap: {
    products: string[];
    painRelievers: string[];
    gainCreators: string[];
  };
};

export async function generateValueProposition(args: {
  segment: string;
  product: string;
}): Promise<ValuePropositionCanvas> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey)
    throw new Error("Value proposition service is not configured");
  const model = process.env.XAI_CHAT_MODEL || "grok-3-mini";

  const segment = args.segment.trim().replace(/\s+/g, " ");
  const product = args.product.trim().replace(/\s+/g, " ");
  if (segment.length < 5 || segment.length > 200) {
    throw new Error("Phân khúc khách hàng phải dài 5-200 ký tự.");
  }
  if (product.length < 10 || product.length > 300) {
    throw new Error("Mô tả sản phẩm/dịch vụ phải dài 10-300 ký tự.");
  }

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia chiến lược thị trường cà phê Việt Nam, thành thạo " +
        "khung Value Proposition Canvas của Strategyzer. Bạn hiểu rõ hành vi " +
        "khách quán cà phê địa phương và cách trùng khớp sản phẩm với nhu cầu " +
        "khách. CHỈ trả về JSON đúng cấu trúc — không markdown, không giải " +
        "thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy tạo Value Proposition Canvas cho một quán cà phê Việt Nam:\n` +
        `- Phân khúc khách hàng mục tiêu: "${segment}"\n` +
        `- Sản phẩm/dịch vụ chính: ${product}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"customerProfile":{"jobs":["...","...","..."],` +
        `"pains":["...","...","..."],"gains":["...","...","..."]},` +
        `"valueMap":{"products":["...","...","..."],` +
        `"painRelievers":["...","...","..."],` +
        `"gainCreators":["...","...","..."]}}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "customerProfile.jobs": ĐÚNG 3 công việc/nhu cầu mà khách muốn hoàn thành khi đến quán.\n` +
        `- "customerProfile.pains": ĐÚNG 3 nỗi đau/khó chịu khách thường gặp.\n` +
        `- "customerProfile.gains": ĐÚNG 3 niềm vui/lợi ích khách mong muốn.\n` +
        `- "valueMap.products": ĐÚNG 3 sản phẩm/dịch vụ cụ thể quán cung cấp.\n` +
        `- "valueMap.painRelievers": ĐÚNG 3 cách quán giảm nỗi đau tương ứng.\n` +
        `- "valueMap.gainCreators": ĐÚNG 3 cách quán tạo niềm vui tương ứng.\n` +
        `- Mỗi chuỗi: tiếng Việt, dài 5-150 ký tự, cụ thể, có thể hành động.\n` +
        `- Không markdown, không bullet ký tự, không tiền tố "1."/"-".`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Value proposition API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi value proposition rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi value proposition không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi value proposition không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const customerProfileRaw = root.customerProfile;
  const valueMapRaw = root.valueMap;
  if (
    !customerProfileRaw ||
    typeof customerProfileRaw !== "object" ||
    !valueMapRaw ||
    typeof valueMapRaw !== "object"
  ) {
    throw new Error(
      "Phản hồi thiếu 'customerProfile' hoặc 'valueMap' hợp lệ",
    );
  }

  const cp = customerProfileRaw as Record<string, unknown>;
  const vm = valueMapRaw as Record<string, unknown>;

  const validateList = (raw: unknown, label: string): string[] => {
    if (!Array.isArray(raw)) {
      throw new Error(`'${label}' phải là mảng`);
    }
    if (raw.length !== 3) {
      throw new Error(
        `'${label}' cần đúng 3 phần tử (nhận ${raw.length})`,
      );
    }
    return raw.map((entry, idx): string => {
      const text = typeof entry === "string" ? entry.trim() : "";
      if (text.length < 5 || text.length > 150) {
        throw new Error(
          `'${label}'[${idx + 1}] phải dài 5-150 ký tự (hiện ${text.length})`,
        );
      }
      return text;
    });
  };

  return {
    customerProfile: {
      jobs: validateList(cp.jobs, "customerProfile.jobs"),
      pains: validateList(cp.pains, "customerProfile.pains"),
      gains: validateList(cp.gains, "customerProfile.gains"),
    },
    valueMap: {
      products: validateList(vm.products, "valueMap.products"),
      painRelievers: validateList(vm.painRelievers, "valueMap.painRelievers"),
      gainCreators: validateList(vm.gainCreators, "valueMap.gainCreators"),
    },
  };
}

// === MEETING AGENDA GENERATOR ===
// AI-powered meeting agenda builder for Vietnamese cafe HR teams. Produces a
// structured timeline of agenda items (time-allotment, topic, owner, prep
// notes, success criteria) plus opening/closing rituals and follow-up steps.

export type MeetingAgendaType =
  | "weekly-standup"
  | "monthly-review"
  | "quarterly-planning"
  | "training"
  | "incident-debrief";

export type MeetingAgendaItem = {
  ord: number;
  minutes: number;
  topic: string;
  owner: string;
  prepNotes: string;
  successCriteria: string;
};

export type MeetingAgenda = {
  title: string;
  summary: string;
  totalMinutes: number;
  items: MeetingAgendaItem[];
  openingRitual: string;
  closingRitual: string;
  nextSteps: string[];
};

export async function generateMeetingAgenda(args: {
  meetingType: MeetingAgendaType;
  durationMinutes: number;
  participantCount: number;
  focusTopics?: string;
  dateIso: string;
}): Promise<MeetingAgenda> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Meeting agenda service is not configured");
  const model = "grok-4-fast";

  const allowedTypes: MeetingAgendaType[] = [
    "weekly-standup",
    "monthly-review",
    "quarterly-planning",
    "training",
    "incident-debrief",
  ];
  if (!allowedTypes.includes(args.meetingType)) {
    throw new Error("Loại cuộc họp không hợp lệ.");
  }
  const allowedDurations = [15, 30, 45, 60, 90];
  if (!allowedDurations.includes(args.durationMinutes)) {
    throw new Error("Thời lượng cuộc họp không hợp lệ.");
  }
  if (
    !Number.isInteger(args.participantCount) ||
    args.participantCount < 1 ||
    args.participantCount > 200
  ) {
    throw new Error("Số người tham dự phải là số nguyên 1-200.");
  }
  if (!/^\d{4}-\d{2}-\d{2}/.test(args.dateIso)) {
    throw new Error("Ngày họp không hợp lệ (cần định dạng YYYY-MM-DD).");
  }

  const focus = (args.focusTopics ?? "").trim().replace(/\s+/g, " ");
  if (focus.length > 500) {
    throw new Error("Chủ đề trọng tâm tối đa 500 ký tự.");
  }

  const meetingTypeLabel: Record<MeetingAgendaType, string> = {
    "weekly-standup": "Họp standup tuần",
    "monthly-review": "Họp đánh giá tháng",
    "quarterly-planning": "Họp lập kế hoạch quý",
    training: "Buổi đào tạo nội bộ",
    "incident-debrief": "Họp rút kinh nghiệm sự cố",
  };

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia điều phối cuộc họp cho chuỗi quán cà phê Việt Nam. " +
        "Bạn thiết kế chương trình họp ngắn gọn, tập trung kết quả, phân vai rõ " +
        "ràng. CHỈ trả về JSON đúng cấu trúc — không markdown, không giải " +
        "thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy thiết kế chương trình cho một cuộc họp nội bộ quán cà phê:\n` +
        `- Loại cuộc họp: ${meetingTypeLabel[args.meetingType]}\n` +
        `- Ngày họp: ${args.dateIso}\n` +
        `- Tổng thời lượng: ${args.durationMinutes} phút\n` +
        `- Số người tham dự: ${args.participantCount}\n` +
        (focus ? `- Chủ đề trọng tâm: ${focus}\n` : "") +
        `\nTrả về JSON đúng cấu trúc:\n` +
        `{"title":"...","summary":"...","totalMinutes":${args.durationMinutes},` +
        `"openingRitual":"...","closingRitual":"...",` +
        `"items":[{"ord":1,"minutes":5,"topic":"...","owner":"...",` +
        `"prepNotes":"...","successCriteria":"..."}],` +
        `"nextSteps":["...","...","..."]}\n\n` +
        `Yêu cầu:\n` +
        `- "title": tiêu đề ngắn gọn (10-100 ký tự, tiếng Việt).\n` +
        `- "summary": 1-2 câu mô tả mục tiêu (20-300 ký tự).\n` +
        `- "openingRitual" và "closingRitual": mô tả nghi thức mở/kết thúc (10-200 ký tự).\n` +
        `- "items": danh sách 3-8 mục chương trình theo thứ tự thời gian.\n` +
        `  + "ord": số nguyên bắt đầu từ 1, liên tiếp.\n` +
        `  + "minutes": số nguyên dương; TỔNG "minutes" PHẢI bằng ${args.durationMinutes} ± 5 phút.\n` +
        `  + "topic": tên mục (5-100 ký tự).\n` +
        `  + "owner": vai trò người chủ trì mục, ví dụ "Quản lý ca", "Barista trưởng" (3-60 ký tự).\n` +
        `  + "prepNotes": ghi chú chuẩn bị trước họp (10-200 ký tự).\n` +
        `  + "successCriteria": tiêu chí thành công của mục (10-200 ký tự).\n` +
        `- "nextSteps": 2-5 hành động sau cuộc họp (mỗi hành động 5-150 ký tự).\n` +
        `- Toàn bộ nội dung bằng tiếng Việt, cụ thể, có thể hành động.\n` +
        `- Không markdown, không bullet ký tự.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meeting agenda API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi meeting agenda rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi meeting agenda không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi meeting agenda không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;

  const requireString = (
    raw: unknown,
    label: string,
    min: number,
    max: number,
  ): string => {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text.length < min || text.length > max) {
      throw new Error(
        `'${label}' phải dài ${min}-${max} ký tự (hiện ${text.length}).`,
      );
    }
    return text;
  };

  const title = requireString(root.title, "title", 10, 100);
  const summary = requireString(root.summary, "summary", 20, 300);
  const openingRitual = requireString(
    root.openingRitual,
    "openingRitual",
    10,
    200,
  );
  const closingRitual = requireString(
    root.closingRitual,
    "closingRitual",
    10,
    200,
  );

  const itemsRaw = root.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length < 3 || itemsRaw.length > 8) {
    throw new Error("'items' cần 3-8 phần tử.");
  }

  const items: MeetingAgendaItem[] = itemsRaw.map((entry, idx): MeetingAgendaItem => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`'items[${idx + 1}]' không hợp lệ.`);
    }
    const obj = entry as Record<string, unknown>;
    const ordRaw = obj.ord;
    const minutesRaw = obj.minutes;
    const ord = typeof ordRaw === "number" ? ordRaw : Number(ordRaw);
    const minutes =
      typeof minutesRaw === "number" ? minutesRaw : Number(minutesRaw);
    if (!Number.isInteger(ord) || ord !== idx + 1) {
      throw new Error(`'items[${idx + 1}].ord' phải bằng ${idx + 1}.`);
    }
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      throw new Error(
        `'items[${idx + 1}].minutes' phải là số nguyên 1-120.`,
      );
    }
    return {
      ord,
      minutes,
      topic: requireString(obj.topic, `items[${idx + 1}].topic`, 5, 100),
      owner: requireString(obj.owner, `items[${idx + 1}].owner`, 3, 60),
      prepNotes: requireString(
        obj.prepNotes,
        `items[${idx + 1}].prepNotes`,
        10,
        200,
      ),
      successCriteria: requireString(
        obj.successCriteria,
        `items[${idx + 1}].successCriteria`,
        10,
        200,
      ),
    };
  });

  const sumMinutes = items.reduce((acc, it) => acc + it.minutes, 0);
  if (Math.abs(sumMinutes - args.durationMinutes) > 5) {
    throw new Error(
      `Tổng thời lượng các mục (${sumMinutes} phút) lệch quá 5 phút so với ${args.durationMinutes} phút.`,
    );
  }

  const nextStepsRaw = root.nextSteps;
  if (
    !Array.isArray(nextStepsRaw) ||
    nextStepsRaw.length < 2 ||
    nextStepsRaw.length > 5
  ) {
    throw new Error("'nextSteps' cần 2-5 phần tử.");
  }
  const nextSteps = nextStepsRaw.map((entry, idx): string => {
    return requireString(entry, `nextSteps[${idx + 1}]`, 5, 150);
  });

  return {
    title,
    summary,
    totalMinutes: sumMinutes,
    items,
    openingRitual,
    closingRitual,
    nextSteps,
  };
}

// === SHIFT OPTIMIZER ===
// Admin-only AI helper for proposing a 7-day shift grid (Sáng/Chiều/Tối)
// for a Vietnamese cafe. Returns strictly validated JSON.

export type ShiftOptimizerEmployeeInput = {
  id: number;
  name: string;
  role: string;
};

export type ShiftOptimizerDayInput = {
  weekdayLabel: string;
  date: string;
};

export type ShiftSuggestionSlot = {
  name: "Sáng" | "Chiều" | "Tối";
  suggestedEmployeeIds: number[];
  reasoning: string;
  focus: string;
};

export type ShiftSuggestionDay = {
  weekdayLabel: string;
  date: string;
  slots: ShiftSuggestionSlot[];
};

export type ShiftSuggestionResult = {
  days: ShiftSuggestionDay[];
  summary: string;
  warnings: string[];
};

const SHIFT_SLOT_ORDER: Array<"Sáng" | "Chiều" | "Tối"> = [
  "Sáng",
  "Chiều",
  "Tối",
];

export async function generateShiftSuggestions(args: {
  employees: ShiftOptimizerEmployeeInput[];
  days: ShiftOptimizerDayInput[];
  expectedTraffic: "low" | "medium" | "high";
  notes: string;
}): Promise<ShiftSuggestionResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Dịch vụ tối ưu ca làm chưa được cấu hình");
  const model = "grok-4-fast";

  if (args.employees.length === 0) {
    throw new Error("Cần ít nhất một nhân viên để gợi ý ca làm");
  }
  if (args.days.length !== 7) {
    throw new Error("Cần đúng 7 ngày để gợi ý ca làm tuần");
  }

  const validIds = new Set<number>(args.employees.map((e) => e.id));
  const trafficLabel =
    args.expectedTraffic === "low"
      ? "Thấp"
      : args.expectedTraffic === "high"
        ? "Cao"
        : "Trung bình";

  const employeeRosterLines = args.employees
    .map((e) => `- id=${e.id} | ${e.name} | vai trò: ${e.role}`)
    .join("\n");
  const daysLines = args.days
    .map((d) => `- ${d.weekdayLabel} (${d.date})`)
    .join("\n");
  const notesBlock =
    args.notes.trim().length > 0
      ? `\nGhi chú thêm từ quản lý:\n${args.notes.trim()}\n`
      : "";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là quản lý vận hành quán cà phê Việt Nam, chuyên xếp lịch ca làm " +
        "tối ưu theo vai trò (barista, server, cashier, manager). Bạn cân đối " +
        "khối lượng, kỹ năng vai trò và lưu lượng khách dự kiến. CHỈ trả về " +
        "JSON đúng cấu trúc yêu cầu — không markdown, không giải thích thêm, " +
        "không tiền tố. Mọi văn bản dùng tiếng Việt tự nhiên.",
    },
    {
      role: "user",
      content:
        `Hãy xếp lịch ca làm trong 7 ngày cho quán cà phê Việt Nam.\n\n` +
        `Lưu lượng khách dự kiến: ${trafficLabel}.\n\n` +
        `Danh sách nhân viên (chỉ được dùng các id sau, không tự bịa):\n` +
        `${employeeRosterLines}\n\n` +
        `7 ngày cần xếp ca (theo thứ tự Thứ 2 → Chủ nhật):\n` +
        `${daysLines}\n${notesBlock}\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"days":[{"weekdayLabel":"Thứ 2","date":"YYYY-MM-DD",` +
        `"slots":[{"name":"Sáng","suggestedEmployeeIds":[id,...],` +
        `"reasoning":"...","focus":"..."},` +
        `{"name":"Chiều","suggestedEmployeeIds":[id,...],` +
        `"reasoning":"...","focus":"..."},` +
        `{"name":"Tối","suggestedEmployeeIds":[id,...],` +
        `"reasoning":"...","focus":"..."}]}],` +
        `"summary":"...","warnings":["..."]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "days" có ĐÚNG 7 phần tử theo đúng thứ tự ngày đã cung cấp ở trên.\n` +
        `- Mỗi ngày có ĐÚNG 3 slot với "name" lần lượt là "Sáng", "Chiều", "Tối".\n` +
        `- "suggestedEmployeeIds": mảng id (số nguyên) lấy từ danh sách nhân viên đã cho, KHÔNG bịa id mới, không trùng lặp trong cùng 1 slot.\n` +
        `- Số nhân viên mỗi slot tùy chỉnh theo lưu lượng (1-2 với lưu lượng thấp, 2-3 trung bình, 3-5 cao), luôn cố gắng có barista/server cho ca có khách.\n` +
        `- "reasoning": 1 câu tiếng Việt, dài 10-400 ký tự, giải thích lý do chọn nhóm nhân viên này.\n` +
        `- "focus": cụm ngắn 3-120 ký tự nêu trọng tâm ca (ví dụ "Đón khách giờ vàng").\n` +
        `- "summary": 1-3 câu tổng quan tuần, dài 10-800 ký tự.\n` +
        `- "warnings": mảng 0-10 cảnh báo ngắn (mỗi cái 5-300 ký tự). Có thể là mảng rỗng.\n` +
        `- Tuyệt đối không thêm markdown, không bullet, không backtick.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Shift optimizer API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi gợi ý ca làm rỗng");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi gợi ý ca làm không phải JSON hợp lệ");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi gợi ý ca làm không phải JSON hợp lệ");
  }

  const root = parsed as Record<string, unknown>;
  const daysRaw = root.days;
  if (!Array.isArray(daysRaw)) {
    throw new Error("'days' phải là mảng");
  }
  if (daysRaw.length !== 7) {
    throw new Error(`'days' cần đúng 7 ngày (nhận ${daysRaw.length})`);
  }

  const days: ShiftSuggestionDay[] = daysRaw.map((dayRaw, dayIdx) => {
    if (!dayRaw || typeof dayRaw !== "object") {
      throw new Error(`'days[${dayIdx}]' phải là object`);
    }
    const dayObj = dayRaw as Record<string, unknown>;
    const expected = args.days[dayIdx];
    const weekdayLabel =
      typeof dayObj.weekdayLabel === "string"
        ? dayObj.weekdayLabel.trim()
        : "";
    const date = typeof dayObj.date === "string" ? dayObj.date.trim() : "";
    if (!weekdayLabel) {
      throw new Error(
        `'days[${dayIdx}].weekdayLabel' thiếu hoặc không hợp lệ`,
      );
    }
    if (!date) {
      throw new Error(`'days[${dayIdx}].date' thiếu hoặc không hợp lệ`);
    }
    const slotsRaw = dayObj.slots;
    if (!Array.isArray(slotsRaw)) {
      throw new Error(`'days[${dayIdx}].slots' phải là mảng`);
    }
    if (slotsRaw.length !== 3) {
      throw new Error(
        `'days[${dayIdx}].slots' cần đúng 3 slot (nhận ${slotsRaw.length})`,
      );
    }
    const slots: ShiftSuggestionSlot[] = slotsRaw.map((slotRaw, slotIdx) => {
      if (!slotRaw || typeof slotRaw !== "object") {
        throw new Error(`'days[${dayIdx}].slots[${slotIdx}]' phải là object`);
      }
      const slotObj = slotRaw as Record<string, unknown>;
      const nameRaw =
        typeof slotObj.name === "string" ? slotObj.name.trim() : "";
      const expectedName = SHIFT_SLOT_ORDER[slotIdx];
      if (nameRaw !== expectedName) {
        throw new Error(
          `'days[${dayIdx}].slots[${slotIdx}].name' phải là "${expectedName}" (nhận "${nameRaw}")`,
        );
      }
      const idsRaw = slotObj.suggestedEmployeeIds;
      if (!Array.isArray(idsRaw)) {
        throw new Error(
          `'days[${dayIdx}].slots[${slotIdx}].suggestedEmployeeIds' phải là mảng`,
        );
      }
      const ids: number[] = [];
      const seen = new Set<number>();
      for (const v of idsRaw) {
        const idNum =
          typeof v === "number"
            ? v
            : typeof v === "string"
              ? Number.parseInt(v, 10)
              : Number.NaN;
        if (!Number.isInteger(idNum)) {
          throw new Error(
            `'days[${dayIdx}].slots[${slotIdx}].suggestedEmployeeIds' chứa giá trị không phải số nguyên`,
          );
        }
        if (!validIds.has(idNum)) {
          throw new Error(
            `'days[${dayIdx}].slots[${slotIdx}].suggestedEmployeeIds' chứa id ${idNum} không có trong danh sách nhân viên`,
          );
        }
        if (seen.has(idNum)) continue;
        seen.add(idNum);
        ids.push(idNum);
      }
      const reasoning =
        typeof slotObj.reasoning === "string" ? slotObj.reasoning.trim() : "";
      if (reasoning.length < 10 || reasoning.length > 400) {
        throw new Error(
          `'days[${dayIdx}].slots[${slotIdx}].reasoning' phải dài 10-400 ký tự (hiện ${reasoning.length})`,
        );
      }
      const focus =
        typeof slotObj.focus === "string" ? slotObj.focus.trim() : "";
      if (focus.length < 3 || focus.length > 120) {
        throw new Error(
          `'days[${dayIdx}].slots[${slotIdx}].focus' phải dài 3-120 ký tự (hiện ${focus.length})`,
        );
      }
      return {
        name: expectedName,
        suggestedEmployeeIds: ids,
        reasoning,
        focus,
      };
    });
    return {
      weekdayLabel: weekdayLabel || expected.weekdayLabel,
      date: date || expected.date,
      slots,
    };
  });

  const summaryRaw =
    typeof root.summary === "string" ? root.summary.trim() : "";
  if (summaryRaw.length < 10 || summaryRaw.length > 800) {
    throw new Error(
      `'summary' phải dài 10-800 ký tự (hiện ${summaryRaw.length})`,
    );
  }

  const warningsRaw = root.warnings;
  let warnings: string[] = [];
  if (warningsRaw !== undefined && warningsRaw !== null) {
    if (!Array.isArray(warningsRaw)) {
      throw new Error("'warnings' phải là mảng");
    }
    if (warningsRaw.length > 10) {
      throw new Error("'warnings' tối đa 10 phần tử");
    }
    warnings = warningsRaw.map((entry, idx) => {
      const text = typeof entry === "string" ? entry.trim() : "";
      if (text.length < 5 || text.length > 300) {
        throw new Error(
          `'warnings[${idx}]' phải dài 5-300 ký tự (hiện ${text.length})`,
        );
      }
      return text;
    });
  }

  return {
    days,
    summary: summaryRaw,
    warnings,
  };
}

// === CUSTOMER REVIEW RESPONDER ===
// Admin-only AI helper that analyzes a customer review for a Vietnamese cafe
// and produces sentiment analysis, key issues, suggested actions, and 3
// distinct response variants (empathetic, professional, warm) ready to be
// posted on review platforms. Strict JSON validation; Vietnamese error
// messages on bad shape.

export type ReviewResponderPlatform =
  | "google"
  | "facebook"
  | "shopeefood"
  | "grabfood"
  | "foody"
  | "internal";

export type ReviewResponderLanguage = "vi" | "en";

export type ReviewSentimentLabel =
  | "very_negative"
  | "negative"
  | "neutral"
  | "positive"
  | "very_positive";

export type ReviewSentiment = {
  score: number;
  label: ReviewSentimentLabel;
  confidence: number;
};

export type ReviewResponseVariants = {
  empathetic: string;
  professional: string;
  warm: string;
};

export type ReviewResponderResult = {
  sentiment: ReviewSentiment;
  detectedIssues: string[];
  suggestedActions: string[];
  responses: ReviewResponseVariants;
};

const REVIEW_RESPONDER_ALLOWED_PLATFORMS: ReadonlyArray<ReviewResponderPlatform> = [
  "google",
  "facebook",
  "shopeefood",
  "grabfood",
  "foody",
  "internal",
];

const REVIEW_RESPONDER_PLATFORM_LABEL: Record<ReviewResponderPlatform, string> =
  {
    google: "Google Maps",
    facebook: "Facebook",
    shopeefood: "ShopeeFood",
    grabfood: "GrabFood",
    foody: "Foody",
    internal: "Phản hồi nội bộ",
  };

const REVIEW_RESPONDER_ALLOWED_LABELS: ReadonlyArray<ReviewSentimentLabel> = [
  "very_negative",
  "negative",
  "neutral",
  "positive",
  "very_positive",
];

export async function generateReviewResponses(args: {
  reviewText: string;
  rating: number;
  platform: ReviewResponderPlatform;
  customerName?: string;
  language: ReviewResponderLanguage;
}): Promise<ReviewResponderResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Dịch vụ phản hồi đánh giá khách hàng chưa được cấu hình.");
  }
  const model = "grok-4-fast";

  if (
    !Number.isInteger(args.rating) ||
    args.rating < 1 ||
    args.rating > 5
  ) {
    throw new Error("Đánh giá sao phải là số nguyên từ 1 đến 5.");
  }
  if (
    !(REVIEW_RESPONDER_ALLOWED_PLATFORMS as ReadonlyArray<string>).includes(
      args.platform,
    )
  ) {
    throw new Error("Nền tảng đánh giá không hợp lệ.");
  }
  if (args.language !== "vi" && args.language !== "en") {
    throw new Error("Ngôn ngữ phản hồi không hợp lệ.");
  }
  const reviewText = args.reviewText.trim();
  if (reviewText.length < 10 || reviewText.length > 1500) {
    throw new Error(
      `Nội dung đánh giá phải dài 10-1500 ký tự (hiện ${reviewText.length}).`,
    );
  }
  const customerName = (args.customerName ?? "").trim().slice(0, 80);

  const platformLabel = REVIEW_RESPONDER_PLATFORM_LABEL[args.platform];
  const languageDirective =
    args.language === "en"
      ? "Viết 3 phản hồi (empathetic, professional, warm) bằng TIẾNG ANH tự nhiên, lịch sự, hướng khách hàng quốc tế."
      : "Viết 3 phản hồi (empathetic, professional, warm) bằng TIẾNG VIỆT tự nhiên, lịch sự, đúng văn phong dịch vụ Việt Nam.";

  const customerLine =
    customerName.length > 0
      ? `- Tên khách: ${customerName}\n`
      : "- Tên khách: (ẩn danh)\n";

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia quản lý danh tiếng (reputation management) cho chuỗi " +
        "quán cà phê Việt Nam. Bạn phân tích đánh giá khách hàng để xác định cảm " +
        "xúc, các vấn đề chính, đề xuất hành động cho đội ngũ, và soạn 3 biến thể " +
        "phản hồi công khai khác nhau về văn phong. CHỈ trả về JSON đúng cấu trúc " +
        "yêu cầu — không markdown, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy phân tích đánh giá khách hàng sau và tạo phản hồi:\n\n` +
        `- Nền tảng: ${platformLabel}\n` +
        `- Số sao: ${args.rating}/5\n` +
        customerLine +
        `- Ngôn ngữ phản hồi: ${args.language === "en" ? "English" : "Tiếng Việt"}\n` +
        `\nNội dung đánh giá gốc:\n"""\n${reviewText}\n"""\n\n` +
        `${languageDirective}\n\n` +
        `Trả về JSON đúng cấu trúc:\n` +
        `{"sentiment":{"score":<number trong [-1,1]>,` +
        `"label":"very_negative"|"negative"|"neutral"|"positive"|"very_positive",` +
        `"confidence":<number trong [0,1]>},` +
        `"detectedIssues":["..."],` +
        `"suggestedActions":["..."],` +
        `"responses":{"empathetic":"...","professional":"...","warm":"..."}}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "sentiment.score": số thực trong [-1, 1] (làm tròn 2 chữ số thập phân), phù hợp với cảm xúc tổng quát của đánh giá.\n` +
        `- "sentiment.label": một trong 5 nhãn cho phép, nhất quán với score (score<=-0.6 very_negative, -0.6<score<=-0.2 negative, -0.2<score<0.2 neutral, 0.2<=score<0.6 positive, score>=0.6 very_positive).\n` +
        `- "sentiment.confidence": số thực trong [0, 1], thể hiện độ tự tin.\n` +
        `- "detectedIssues": mảng 0-5 cụm tiếng Việt ngắn (mỗi cụm 3-120 ký tự). Có thể rỗng nếu đánh giá tích cực không có vấn đề.\n` +
        `- "suggestedActions": mảng 1-4 hành động cụ thể tiếng Việt cho đội ngũ (mỗi cái 10-200 ký tự).\n` +
        `- "responses.empathetic": phản hồi thiên về thấu cảm, 80-400 ký tự.\n` +
        `- "responses.professional": phản hồi văn phong chuyên nghiệp, 80-400 ký tự.\n` +
        `- "responses.warm": phản hồi ấm áp, gần gũi, 80-400 ký tự.\n` +
        `- 3 phản hồi PHẢI khác biệt rõ ràng về văn phong (không lặp câu).\n` +
        `- Không markdown, không bullet ký tự, không backtick, không tiền tố "Phản hồi:".`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
      max_tokens: 1800,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Review responder API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi review responder rỗng.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi review responder không phải JSON hợp lệ.");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi review responder không phải JSON hợp lệ.");
  }

  const root = parsed as Record<string, unknown>;

  const sentimentRaw = root.sentiment;
  if (!sentimentRaw || typeof sentimentRaw !== "object") {
    throw new Error("'sentiment' phải là object.");
  }
  const sObj = sentimentRaw as Record<string, unknown>;
  const scoreRaw =
    typeof sObj.score === "number"
      ? sObj.score
      : typeof sObj.score === "string"
        ? Number.parseFloat(sObj.score)
        : Number.NaN;
  if (!Number.isFinite(scoreRaw) || scoreRaw < -1 || scoreRaw > 1) {
    throw new Error("'sentiment.score' phải là số thực trong [-1, 1].");
  }
  const confidenceRaw =
    typeof sObj.confidence === "number"
      ? sObj.confidence
      : typeof sObj.confidence === "string"
        ? Number.parseFloat(sObj.confidence)
        : Number.NaN;
  if (
    !Number.isFinite(confidenceRaw) ||
    confidenceRaw < 0 ||
    confidenceRaw > 1
  ) {
    throw new Error("'sentiment.confidence' phải là số thực trong [0, 1].");
  }
  const labelRaw = typeof sObj.label === "string" ? sObj.label.trim() : "";
  if (
    !(REVIEW_RESPONDER_ALLOWED_LABELS as ReadonlyArray<string>).includes(
      labelRaw,
    )
  ) {
    throw new Error("'sentiment.label' không hợp lệ.");
  }
  const label = labelRaw as ReviewSentimentLabel;

  const issuesRaw = root.detectedIssues;
  if (!Array.isArray(issuesRaw)) {
    throw new Error("'detectedIssues' phải là mảng.");
  }
  if (issuesRaw.length > 5) {
    throw new Error("'detectedIssues' tối đa 5 phần tử.");
  }
  const detectedIssues: string[] = issuesRaw.map((entry, idx): string => {
    const text = typeof entry === "string" ? entry.trim() : "";
    if (text.length < 3 || text.length > 120) {
      throw new Error(
        `'detectedIssues[${idx + 1}]' phải dài 3-120 ký tự (hiện ${text.length}).`,
      );
    }
    return text;
  });

  const actionsRaw = root.suggestedActions;
  if (!Array.isArray(actionsRaw)) {
    throw new Error("'suggestedActions' phải là mảng.");
  }
  if (actionsRaw.length < 1 || actionsRaw.length > 4) {
    throw new Error("'suggestedActions' cần 1-4 phần tử.");
  }
  const suggestedActions: string[] = actionsRaw.map((entry, idx): string => {
    const text = typeof entry === "string" ? entry.trim() : "";
    if (text.length < 10 || text.length > 200) {
      throw new Error(
        `'suggestedActions[${idx + 1}]' phải dài 10-200 ký tự (hiện ${text.length}).`,
      );
    }
    return text;
  });

  const responsesRaw = root.responses;
  if (!responsesRaw || typeof responsesRaw !== "object") {
    throw new Error("'responses' phải là object.");
  }
  const rObj = responsesRaw as Record<string, unknown>;

  const requireResponse = (raw: unknown, key: string): string => {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text.length < 80 || text.length > 400) {
      throw new Error(
        `'responses.${key}' phải dài 80-400 ký tự (hiện ${text.length}).`,
      );
    }
    return text;
  };

  const empathetic = requireResponse(rObj.empathetic, "empathetic");
  const professional = requireResponse(rObj.professional, "professional");
  const warm = requireResponse(rObj.warm, "warm");

  if (
    empathetic === professional ||
    empathetic === warm ||
    professional === warm
  ) {
    throw new Error("Ba biến thể phản hồi phải khác biệt rõ ràng.");
  }

  return {
    sentiment: {
      score: Math.round(scoreRaw * 100) / 100,
      label,
      confidence: Math.round(confidenceRaw * 100) / 100,
    },
    detectedIssues,
    suggestedActions,
    responses: {
      empathetic,
      professional,
      warm,
    },
  };
}

// === WEEKLY NEWSLETTER GENERATOR ===
// Admin-only AI helper that drafts a Vietnamese internal weekly newsletter for
// a cafe team. Produces a structured object (title with emoji, greeting,
// 3-6 sections with markdown body, closing, optional quote/weather, signature)
// ready to be rendered to HTML or Markdown. Strict JSON validation with
// Vietnamese error messages.

export type WeeklyNewsletterTone = "warm" | "professional" | "playful";
export type WeeklyNewsletterLength = "short" | "medium" | "long";

export type WeeklyNewsletterSection = {
  heading: string;
  body: string;
};

export type WeeklyNewsletterQuote = {
  text: string;
  author: string;
};

export type WeeklyNewsletterResult = {
  title: string;
  emoji: string;
  greeting: string;
  sections: WeeklyNewsletterSection[];
  closing: string;
  quote?: WeeklyNewsletterQuote;
  weather?: string;
  signature: string;
  wordCount: number;
};

const WEEKLY_NEWSLETTER_TONES: ReadonlyArray<WeeklyNewsletterTone> = [
  "warm",
  "professional",
  "playful",
];

const WEEKLY_NEWSLETTER_LENGTHS: ReadonlyArray<WeeklyNewsletterLength> = [
  "short",
  "medium",
  "long",
];

const WEEKLY_NEWSLETTER_TONE_LABEL: Record<WeeklyNewsletterTone, string> = {
  warm: "ấm áp, gần gũi",
  professional: "chuyên nghiệp, súc tích",
  playful: "vui tươi, dí dỏm",
};

const WEEKLY_NEWSLETTER_LENGTH_LABEL: Record<WeeklyNewsletterLength, string> = {
  short: "ngắn (khoảng 300 từ tổng cộng)",
  medium: "trung bình (khoảng 600 từ tổng cộng)",
  long: "dài (khoảng 1000 từ tổng cộng)",
};

const WEEKLY_NEWSLETTER_LENGTH_TARGET: Record<WeeklyNewsletterLength, number> = {
  short: 300,
  medium: 600,
  long: 1000,
};

const WEEKLY_NEWSLETTER_MAX_TOKENS: Record<WeeklyNewsletterLength, number> = {
  short: 1000,
  medium: 2000,
  long: 3000,
};

export async function generateWeeklyNewsletter(args: {
  weekEndingIso: string;
  tone: WeeklyNewsletterTone;
  length: WeeklyNewsletterLength;
  highlights?: string;
  includeWeather: boolean;
  includeQuote: boolean;
}): Promise<WeeklyNewsletterResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Dịch vụ bản tin nội bộ chưa được cấu hình.");
  }
  const model = "grok-4-fast";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.weekEndingIso)) {
    throw new Error("Ngày kết thúc tuần phải có định dạng YYYY-MM-DD.");
  }
  if (
    !(WEEKLY_NEWSLETTER_TONES as ReadonlyArray<string>).includes(args.tone)
  ) {
    throw new Error("Văn phong bản tin không hợp lệ.");
  }
  if (
    !(WEEKLY_NEWSLETTER_LENGTHS as ReadonlyArray<string>).includes(args.length)
  ) {
    throw new Error("Độ dài bản tin không hợp lệ.");
  }
  if (typeof args.includeWeather !== "boolean") {
    throw new Error("Tham số 'includeWeather' phải là boolean.");
  }
  if (typeof args.includeQuote !== "boolean") {
    throw new Error("Tham số 'includeQuote' phải là boolean.");
  }

  const highlights = (args.highlights ?? "").trim().replace(/\s+\n/g, "\n");
  if (highlights.length > 1500) {
    throw new Error("Điểm nhấn tối đa 1500 ký tự.");
  }

  const toneLabel = WEEKLY_NEWSLETTER_TONE_LABEL[args.tone];
  const lengthLabel = WEEKLY_NEWSLETTER_LENGTH_LABEL[args.length];
  const targetWords = WEEKLY_NEWSLETTER_LENGTH_TARGET[args.length];
  const maxTokens = WEEKLY_NEWSLETTER_MAX_TOKENS[args.length];

  const highlightsLine =
    highlights.length > 0
      ? `\nĐiểm nhấn quản lý muốn bản tin nhấn mạnh (bắt buộc đan vào nội dung):\n"""\n${highlights}\n"""\n`
      : "\n(Không có điểm nhấn cụ thể — AI tự đề xuất các nội dung phù hợp với quán cà phê Việt Nam.)\n";

  const weatherDirective = args.includeWeather
    ? `- "weather": MỘT câu (40-200 ký tự) đề cập thời tiết Việt Nam tuần này và gợi ý đồ uống/không khí quán phù hợp.\n`
    : `- KHÔNG bao gồm trường "weather" trong JSON.\n`;

  const quoteDirective = args.includeQuote
    ? `- "quote": object {"text": "...", "author": "..."} với text 20-220 ký tự (câu trích dẫn truyền cảm hứng, có thể dịch sang tiếng Việt), author 2-80 ký tự (tên tác giả thực, không bịa).\n`
    : `- KHÔNG bao gồm trường "quote" trong JSON.\n`;

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia truyền thông nội bộ cho chuỗi quán cà phê Việt Nam. " +
        "Bạn soạn bản tin tuần dành cho đội ngũ barista, phục vụ, quản lý ca — " +
        "tập trung gắn kết, ghi nhận thành tựu, định hướng tuần tới. CHỈ trả " +
        "về JSON đúng cấu trúc — không markdown bao quanh, không giải thích, " +
        "không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy soạn bản tin nội bộ tuần cho đội ngũ quán cà phê:\n` +
        `- Tuần kết thúc vào: ${args.weekEndingIso}\n` +
        `- Văn phong: ${toneLabel}\n` +
        `- Độ dài mục tiêu: ${lengthLabel}\n` +
        `- Có nhắc thời tiết: ${args.includeWeather ? "Có" : "Không"}\n` +
        `- Có câu trích dẫn: ${args.includeQuote ? "Có" : "Không"}\n` +
        highlightsLine +
        `\nTrả về JSON đúng cấu trúc:\n` +
        `{"title":"...","emoji":"...","greeting":"...",` +
        `"sections":[{"heading":"Tin nổi bật","body":"..."},` +
        `{"heading":"Thành tựu của đội","body":"..."},` +
        `{"heading":"Kế hoạch tuần tới","body":"..."},` +
        `{"heading":"Lời nhắn từ quản lý","body":"..."}],` +
        `"closing":"...","signature":"...","wordCount":${targetWords}` +
        (args.includeQuote ? `,"quote":{"text":"...","author":"..."}` : "") +
        (args.includeWeather ? `,"weather":"..."` : "") +
        `}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "title": tiêu đề bản tin (10-120 ký tự, tiếng Việt, đã chứa emoji ở đầu hoặc cuối).\n` +
        `- "emoji": MỘT ký tự emoji duy nhất phản ánh chủ đề tuần (ví dụ ☕, 🌟, 🎉, 🍂).\n` +
        `- "greeting": đoạn chào mở đầu 30-150 ký tự, gọi đội ngũ thân mật.\n` +
        `- "sections": 3-6 phần. BẮT BUỘC có các phần với heading chính xác sau (theo thứ tự): ` +
        `"Tin nổi bật", "Thành tựu của đội", "Kế hoạch tuần tới", "Lời nhắn từ quản lý". ` +
        `Có thể thêm tối đa 2 phần phụ với heading tự do (3-60 ký tự). ` +
        `Phần "Câu trích dẫn" KHÔNG nằm trong sections (đã có trường "quote" riêng nếu được yêu cầu).\n` +
        `  + "heading": 3-60 ký tự.\n` +
        `  + "body": markdown thuần (chỉ dùng -, **, *, dòng trống). ${
          args.length === "short"
            ? "60-400"
            : args.length === "medium"
              ? "120-700"
              : "180-1200"
        } ký tự mỗi phần.\n` +
        `- "closing": đoạn kết 30-200 ký tự, tích cực, khích lệ.\n` +
        weatherDirective +
        quoteDirective +
        `- "signature": dòng ký tên gợi ý 5-80 ký tự (ví dụ "— Đội ngũ Quản lý quán").\n` +
        `- "wordCount": số nguyên ước lượng tổng số từ toàn bộ bản tin (greeting+sections+closing+quote+weather). Mục tiêu khoảng ${targetWords} từ, cho phép dao động ±40%.\n` +
        `- Toàn bộ nội dung BẰNG TIẾNG VIỆT (trừ tên tác giả nước ngoài trong quote).\n` +
        `- Không bọc JSON trong code fence, không giải thích thêm.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Weekly newsletter API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi bản tin tuần rỗng.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Phản hồi bản tin tuần không phải JSON hợp lệ.");
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi bản tin tuần không phải JSON hợp lệ.");
  }

  const root = parsed as Record<string, unknown>;

  const requireString = (
    raw: unknown,
    label: string,
    min: number,
    max: number,
  ): string => {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text.length < min || text.length > max) {
      throw new Error(
        `'${label}' phải dài ${min}-${max} ký tự (hiện ${text.length}).`,
      );
    }
    return text;
  };

  const title = requireString(root.title, "title", 10, 120);
  const emoji = requireString(root.emoji, "emoji", 1, 8);
  const greeting = requireString(root.greeting, "greeting", 30, 150);
  const closing = requireString(root.closing, "closing", 30, 200);
  const signature = requireString(root.signature, "signature", 5, 80);

  const sectionsRaw = root.sections;
  if (
    !Array.isArray(sectionsRaw) ||
    sectionsRaw.length < 3 ||
    sectionsRaw.length > 6
  ) {
    throw new Error("'sections' cần 3-6 phần tử.");
  }

  const bodyMin =
    args.length === "short" ? 60 : args.length === "medium" ? 120 : 180;
  const bodyMax =
    args.length === "short" ? 400 : args.length === "medium" ? 700 : 1200;

  const sections: WeeklyNewsletterSection[] = sectionsRaw.map(
    (entry, idx): WeeklyNewsletterSection => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`'sections[${idx + 1}]' không hợp lệ.`);
      }
      const obj = entry as Record<string, unknown>;
      const heading = requireString(
        obj.heading,
        `sections[${idx + 1}].heading`,
        3,
        60,
      );
      const body = requireString(
        obj.body,
        `sections[${idx + 1}].body`,
        bodyMin,
        bodyMax,
      );
      return { heading, body };
    },
  );

  const requiredHeadings = [
    "Tin nổi bật",
    "Thành tựu của đội",
    "Kế hoạch tuần tới",
    "Lời nhắn từ quản lý",
  ];
  const headingSet = new Set(sections.map((s) => s.heading));
  for (const h of requiredHeadings) {
    if (!headingSet.has(h)) {
      throw new Error(`Thiếu phần bắt buộc '${h}'.`);
    }
  }

  let quote: WeeklyNewsletterQuote | undefined;
  if (args.includeQuote) {
    const qRaw = root.quote;
    if (!qRaw || typeof qRaw !== "object") {
      throw new Error("'quote' phải là object khi yêu cầu trích dẫn.");
    }
    const qObj = qRaw as Record<string, unknown>;
    const qText = requireString(qObj.text, "quote.text", 20, 220);
    const qAuthor = requireString(qObj.author, "quote.author", 2, 80);
    quote = { text: qText, author: qAuthor };
  }

  let weather: string | undefined;
  if (args.includeWeather) {
    weather = requireString(root.weather, "weather", 40, 200);
  }

  const wcRaw = root.wordCount;
  const wcNum =
    typeof wcRaw === "number"
      ? wcRaw
      : typeof wcRaw === "string"
        ? Number.parseInt(wcRaw, 10)
        : Number.NaN;
  if (!Number.isFinite(wcNum) || wcNum < 50 || wcNum > 3000) {
    throw new Error("'wordCount' phải là số nguyên 50-3000.");
  }
  const wordCount = Math.round(wcNum);

  const result: WeeklyNewsletterResult = {
    title,
    emoji,
    greeting,
    sections,
    closing,
    signature,
    wordCount,
  };
  if (quote) result.quote = quote;
  if (weather) result.weather = weather;
  return result;
}

// === PLATE STYLING GENERATOR ===
// Generates a square 1024x1024 plate-styling concept image for a Vietnamese
// cafe dish. Mirrors the prompt-template pattern used by generatePoster /
// generateAdBanner / generateStorefrontMockup but returns base64 so that
// callers can render the image without depending on a temporary hosted URL.

const PLATE_SHAPE_DESC: Record<string, string> = {
  round: "a classic round ceramic plate",
  square: "a clean square ceramic plate",
  rectangular: "an elongated rectangular ceramic plate",
  "wooden-board": "a rustic wooden serving board",
};

const PLATE_MOOD_DESC: Record<string, string> = {
  minimalist:
    "minimalist plating with restrained negative space and a single focal point",
  "rustic-vietnamese":
    "rustic Vietnamese styling with handmade ceramics, fresh herbs and traditional accents",
  "modern-fusion":
    "modern fusion plating that blends Vietnamese ingredients with contemporary techniques",
  "colorful-tropical":
    "colorful tropical styling with vibrant fruits, edible flowers and bright contrasts",
  "fine-dining":
    "fine-dining styling with precise composition, micro garnishes and elegant negative space",
};

const PLATE_BACKGROUND_DESC: Record<string, string> = {
  marble: "polished white marble surface",
  linen: "neutral linen tablecloth with subtle texture",
  "dark-wood": "dark stained wooden table surface",
  pastel: "soft pastel paper backdrop",
  parchment: "warm parchment paper backdrop with faint creases",
};

export type PlateStylingImageResult = {
  imageBase64: string;
  prompt: string;
  revisedPrompt?: string;
};

export async function generatePlateStyling(args: {
  dishName: string;
  plateShape: string;
  mood: string;
  background: string;
  garnishes?: string;
}): Promise<PlateStylingImageResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("Image service is not configured");
  const model = process.env.XAI_IMAGE_MODEL || "grok-imagine-image";

  const dishName = args.dishName.trim().replace(/\s+/g, " ");
  if (dishName.length < 3 || dishName.length > 80) {
    throw new Error(
      `Tên món phải dài 3-80 ký tự (hiện ${dishName.length}).`,
    );
  }

  const plateDesc = PLATE_SHAPE_DESC[args.plateShape];
  if (!plateDesc) throw new Error("Kiểu đĩa không hợp lệ.");

  const moodDesc = PLATE_MOOD_DESC[args.mood];
  if (!moodDesc) throw new Error("Phong cách trình bày không hợp lệ.");

  const backgroundDesc = PLATE_BACKGROUND_DESC[args.background];
  if (!backgroundDesc) throw new Error("Nền chụp không hợp lệ.");

  const garnishesRaw = (args.garnishes ?? "").trim().replace(/\s+/g, " ");
  if (garnishesRaw.length > 200) {
    throw new Error(
      `Trang trí dài ${garnishesRaw.length} ký tự (tối đa 200).`,
    );
  }
  const garnishesClause = garnishesRaw
    ? `, garnished with ${garnishesRaw}`
    : "";

  const prompt =
    `Top-down food photography concept of a Vietnamese cafe dish "${dishName}", ` +
    `plated on ${plateDesc}, ${moodDesc}, set on a ${backgroundDesc}${garnishesClause}, ` +
    `appetizing presentation, soft natural daylight, gentle shadows, ` +
    `high detail, professional food styling, no text in image, family-friendly, ` +
    `square 1:1 composition`;

  const res = await fetch(IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Image API ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    data?: Array<{
      b64_json?: string;
      revised_prompt?: string;
    }>;
  };
  const item = data.data?.[0];
  if (!item?.b64_json) {
    throw new Error("Không sinh được ảnh trình bày món. Vui lòng thử lại.");
  }

  const result: PlateStylingImageResult = {
    imageBase64: item.b64_json,
    prompt,
  };
  if (item.revised_prompt) {
    result.revisedPrompt = item.revised_prompt;
  }
  return result;
}

// === STAFF COACHING SCRIPT GENERATOR ===
// Admin-only AI helper that drafts a personalized Vietnamese coaching script
// for a cafe staff member. Returns a strictly validated JSON object that the
// UI renders as numbered phase cards with quoted script lines, do/avoid
// phrases, success criteria, scenario branches, and empathy tips.

export type StaffCoachingRole =
  | "Pha chế"
  | "Phục vụ"
  | "Thu ngân"
  | "Quản lý";

export type StaffCoachingReason =
  | "positive-recognition"
  | "performance-gap"
  | "behavioral-concern"
  | "career-development"
  | "onboarding"
  | "return-from-leave";

export type StaffCoachingTone =
  | "supportive"
  | "direct"
  | "coaching"
  | "mentor";

export type StaffCoachingPhase =
  | "Mở đầu"
  | "Lắng nghe"
  | "Phản hồi"
  | "Hành động"
  | "Khép lại";

export type StaffCoachingStep = {
  ord: number;
  minutes: number;
  phase: StaffCoachingPhase;
  scriptLines: string[];
  coachNote: string;
};

export type StaffCoachingScenarioBranch = {
  when: string;
  then: string;
};

export type StaffCoachingScript = {
  title: string;
  openingLine: string;
  steps: StaffCoachingStep[];
  doSayPhrases: string[];
  avoidPhrases: string[];
  successCriteria: string[];
  followUpSuggestion: string;
  scenarioBranches: StaffCoachingScenarioBranch[];
  empathyTips: string[];
};

const STAFF_COACHING_ROLES: ReadonlyArray<StaffCoachingRole> = [
  "Pha chế",
  "Phục vụ",
  "Thu ngân",
  "Quản lý",
];

const STAFF_COACHING_REASONS: ReadonlyArray<StaffCoachingReason> = [
  "positive-recognition",
  "performance-gap",
  "behavioral-concern",
  "career-development",
  "onboarding",
  "return-from-leave",
];

const STAFF_COACHING_TONES: ReadonlyArray<StaffCoachingTone> = [
  "supportive",
  "direct",
  "coaching",
  "mentor",
];

const STAFF_COACHING_DURATIONS: ReadonlyArray<number> = [5, 10, 15, 20, 30];

const STAFF_COACHING_PHASES: ReadonlyArray<StaffCoachingPhase> = [
  "Mở đầu",
  "Lắng nghe",
  "Phản hồi",
  "Hành động",
  "Khép lại",
];

const STAFF_COACHING_REASON_LABEL: Record<StaffCoachingReason, string> = {
  "positive-recognition": "Ghi nhận điểm tích cực",
  "performance-gap": "Khoảng cách hiệu suất",
  "behavioral-concern": "Vấn đề hành vi / thái độ",
  "career-development": "Định hướng phát triển nghề",
  onboarding: "Hỗ trợ nhân sự mới onboarding",
  "return-from-leave": "Quay trở lại sau kỳ nghỉ",
};

const STAFF_COACHING_TONE_LABEL: Record<StaffCoachingTone, string> = {
  supportive: "Đồng hành, ấm áp",
  direct: "Thẳng thắn, rõ ràng",
  coaching: "Đặt câu hỏi khai vấn",
  mentor: "Cố vấn dày dạn kinh nghiệm",
};

export async function generateStaffCoachingScript(args: {
  employeeName: string;
  role: StaffCoachingRole;
  reason: StaffCoachingReason;
  situation: string;
  tone: StaffCoachingTone;
  durationMinutes: number;
}): Promise<StaffCoachingScript> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("Dịch vụ kịch bản huấn luyện chưa được cấu hình.");
  }
  const model = "grok-4-fast";

  const employeeName = args.employeeName.trim().replace(/\s+/g, " ");
  if (employeeName.length < 2 || employeeName.length > 50) {
    throw new Error("Tên nhân sự phải dài 2-50 ký tự.");
  }
  if (!(STAFF_COACHING_ROLES as ReadonlyArray<string>).includes(args.role)) {
    throw new Error("Vai trò nhân sự không hợp lệ.");
  }
  if (
    !(STAFF_COACHING_REASONS as ReadonlyArray<string>).includes(args.reason)
  ) {
    throw new Error("Lý do huấn luyện không hợp lệ.");
  }
  if ((STAFF_COACHING_TONES as ReadonlyArray<string>).indexOf(args.tone) < 0) {
    throw new Error("Văn phong không hợp lệ.");
  }
  if (!STAFF_COACHING_DURATIONS.includes(args.durationMinutes)) {
    throw new Error("Thời lượng buổi nói chuyện không hợp lệ.");
  }

  const situation = args.situation.trim().replace(/\s+/g, " ");
  if (situation.length < 20 || situation.length > 600) {
    throw new Error("Mô tả tình huống phải dài 20-600 ký tự.");
  }

  const reasonLabel = STAFF_COACHING_REASON_LABEL[args.reason];
  const toneLabel = STAFF_COACHING_TONE_LABEL[args.tone];

  const messages = [
    {
      role: "system",
      content:
        "Bạn là chuyên gia huấn luyện nhân sự cho chuỗi quán cà phê Việt " +
        "Nam. Bạn soạn kịch bản nói chuyện 1:1 ngắn gọn, giàu thấu cảm, có " +
        "cấu trúc rõ ràng theo các giai đoạn: Mở đầu, Lắng nghe, Phản hồi, " +
        "Hành động, Khép lại. CHỈ trả về JSON đúng cấu trúc — không markdown " +
        "bao quanh, không giải thích, không tiền tố.",
    },
    {
      role: "user",
      content:
        `Hãy soạn kịch bản huấn luyện 1:1 cho một nhân sự tại quán cà phê:\n` +
        `- Tên nhân sự: ${employeeName}\n` +
        `- Vai trò: ${args.role}\n` +
        `- Lý do huấn luyện: ${reasonLabel}\n` +
        `- Văn phong người quản lý cần dùng: ${toneLabel}\n` +
        `- Tổng thời lượng dự kiến: ${args.durationMinutes} phút\n` +
        `- Tình huống cụ thể (do quản lý mô tả):\n"""\n${situation}\n"""\n` +
        `\nTrả về JSON đúng cấu trúc:\n` +
        `{"title":"...","openingLine":"...",` +
        `"steps":[{"ord":1,"minutes":2,"phase":"Mở đầu",` +
        `"scriptLines":["...","..."],"coachNote":"..."}],` +
        `"doSayPhrases":["...","...","..."],` +
        `"avoidPhrases":["...","...","..."],` +
        `"successCriteria":["...","..."],` +
        `"followUpSuggestion":"...",` +
        `"scenarioBranches":[{"when":"...","then":"..."}],` +
        `"empathyTips":["...","..."]}\n\n` +
        `Yêu cầu nghiêm ngặt:\n` +
        `- "title": tiêu đề ngắn (10-100 ký tự, tiếng Việt, có tên ${employeeName}).\n` +
        `- "openingLine": câu chào mở đầu tự nhiên (20-200 ký tự).\n` +
        `- "steps": 4-6 bước theo thứ tự thời gian.\n` +
        `  + "ord": số nguyên bắt đầu từ 1, liên tiếp.\n` +
        `  + "minutes": số nguyên dương; TỔNG "minutes" PHẢI bằng ${args.durationMinutes} ± 5 phút.\n` +
        `  + "phase": MỘT trong các giá trị: "Mở đầu", "Lắng nghe", "Phản hồi", "Hành động", "Khép lại".\n` +
        `  + "scriptLines": 2-5 câu thoại mẫu cho quản lý đọc, mỗi câu 20-200 ký tự, tiếng Việt tự nhiên.\n` +
        `  + "coachNote": gợi ý ngắn cho người quản lý về cách dẫn dắt bước này (15-200 ký tự).\n` +
        `- "doSayPhrases": 3-6 câu/cụm nên nói (10-150 ký tự mỗi cụm).\n` +
        `- "avoidPhrases": 3-6 câu/cụm cần tránh (10-150 ký tự mỗi cụm).\n` +
        `- "successCriteria": 2-4 tiêu chí thành công có thể đo được (10-180 ký tự).\n` +
        `- "followUpSuggestion": gợi ý hoạt động theo dõi sau buổi nói chuyện (20-220 ký tự).\n` +
        `- "scenarioBranches": 2-3 nhánh tình huống if/then. "when" mô tả tình huống bất ngờ (10-160 ký tự), "then" hướng xử lý (15-220 ký tự).\n` +
        `- "empathyTips": 2-4 gợi ý phù hợp văn hoá Việt Nam (15-200 ký tự).\n` +
        `- TOÀN BỘ nội dung BẰNG TIẾNG VIỆT, cụ thể với vai trò "${args.role}" và lý do "${reasonLabel}".\n` +
        `- Không markdown, không bullet ký tự, không bọc JSON trong code fence.`,
    },
  ];

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: 2200,
      response_format: { type: "json_object" },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Staff coaching API ${res.status}: ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Phản hồi kịch bản huấn luyện rỗng.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error(
        "Phản hồi kịch bản huấn luyện không phải JSON hợp lệ.",
      );
    }
    parsed = JSON.parse(match[0]);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Phản hồi kịch bản huấn luyện không phải JSON hợp lệ.");
  }

  const root = parsed as Record<string, unknown>;

  const requireString = (
    raw: unknown,
    label: string,
    min: number,
    max: number,
  ): string => {
    const text = typeof raw === "string" ? raw.trim() : "";
    if (text.length < min || text.length > max) {
      throw new Error(
        `'${label}' phải dài ${min}-${max} ký tự (hiện ${text.length}).`,
      );
    }
    return text;
  };

  const requireStringArray = (
    raw: unknown,
    label: string,
    minCount: number,
    maxCount: number,
    minLen: number,
    maxLen: number,
  ): string[] => {
    if (!Array.isArray(raw) || raw.length < minCount || raw.length > maxCount) {
      throw new Error(
        `'${label}' cần ${minCount}-${maxCount} phần tử (hiện ${
          Array.isArray(raw) ? raw.length : 0
        }).`,
      );
    }
    return raw.map((item, idx): string =>
      requireString(item, `${label}[${idx + 1}]`, minLen, maxLen),
    );
  };

  const title = requireString(root.title, "title", 10, 100);
  const openingLine = requireString(root.openingLine, "openingLine", 20, 200);
  const followUpSuggestion = requireString(
    root.followUpSuggestion,
    "followUpSuggestion",
    20,
    220,
  );

  const stepsRaw = root.steps;
  if (!Array.isArray(stepsRaw) || stepsRaw.length < 4 || stepsRaw.length > 6) {
    throw new Error("'steps' cần 4-6 phần tử.");
  }

  const steps: StaffCoachingStep[] = stepsRaw.map(
    (entry, idx): StaffCoachingStep => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`'steps[${idx + 1}]' không hợp lệ.`);
      }
      const obj = entry as Record<string, unknown>;
      const ordRaw = obj.ord;
      const minutesRaw = obj.minutes;
      const ord = typeof ordRaw === "number" ? ordRaw : Number(ordRaw);
      const minutes =
        typeof minutesRaw === "number" ? minutesRaw : Number(minutesRaw);
      if (!Number.isInteger(ord) || ord !== idx + 1) {
        throw new Error(`'steps[${idx + 1}].ord' phải bằng ${idx + 1}.`);
      }
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
        throw new Error(
          `'steps[${idx + 1}].minutes' phải là số nguyên 1-60.`,
        );
      }
      const phaseRaw =
        typeof obj.phase === "string" ? (obj.phase as string).trim() : "";
      if (
        !(STAFF_COACHING_PHASES as ReadonlyArray<string>).includes(phaseRaw)
      ) {
        throw new Error(
          `'steps[${idx + 1}].phase' phải là một trong: ${STAFF_COACHING_PHASES.join(", ")}.`,
        );
      }
      const phase = phaseRaw as StaffCoachingPhase;
      const scriptLines = requireStringArray(
        obj.scriptLines,
        `steps[${idx + 1}].scriptLines`,
        2,
        5,
        20,
        200,
      );
      const coachNote = requireString(
        obj.coachNote,
        `steps[${idx + 1}].coachNote`,
        15,
        200,
      );
      return { ord, minutes, phase, scriptLines, coachNote };
    },
  );

  const sumMinutes = steps.reduce((acc, s) => acc + s.minutes, 0);
  if (Math.abs(sumMinutes - args.durationMinutes) > 5) {
    throw new Error(
      `Tổng thời lượng các bước (${sumMinutes} phút) lệch quá 5 phút so với ${args.durationMinutes} phút.`,
    );
  }

  const doSayPhrases = requireStringArray(
    root.doSayPhrases,
    "doSayPhrases",
    3,
    6,
    10,
    150,
  );
  const avoidPhrases = requireStringArray(
    root.avoidPhrases,
    "avoidPhrases",
    3,
    6,
    10,
    150,
  );
  const successCriteria = requireStringArray(
    root.successCriteria,
    "successCriteria",
    2,
    4,
    10,
    180,
  );
  const empathyTips = requireStringArray(
    root.empathyTips,
    "empathyTips",
    2,
    4,
    15,
    200,
  );

  const branchesRaw = root.scenarioBranches;
  if (
    !Array.isArray(branchesRaw) ||
    branchesRaw.length < 2 ||
    branchesRaw.length > 3
  ) {
    throw new Error("'scenarioBranches' cần 2-3 phần tử.");
  }
  const scenarioBranches: StaffCoachingScenarioBranch[] = branchesRaw.map(
    (entry, idx): StaffCoachingScenarioBranch => {
      if (!entry || typeof entry !== "object") {
        throw new Error(`'scenarioBranches[${idx + 1}]' không hợp lệ.`);
      }
      const obj = entry as Record<string, unknown>;
      return {
        when: requireString(
          obj.when,
          `scenarioBranches[${idx + 1}].when`,
          10,
          160,
        ),
        then: requireString(
          obj.then,
          `scenarioBranches[${idx + 1}].then`,
          15,
          220,
        ),
      };
    },
  );

  return {
    title,
    openingLine,
    steps,
    doSayPhrases,
    avoidPhrases,
    successCriteria,
    followUpSuggestion,
    scenarioBranches,
    empathyTips,
  };
}
