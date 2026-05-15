"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { pickEmployeeOfTheDay, setCachedEotd } from "@/lib/eotd-data";

export async function refreshEotdAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    return { ok: false, error: "Chỉ admin mới có quyền thực hiện" };
  }

  try {
    const result = await pickEmployeeOfTheDay();
    if (!result) {
      return {
        ok: false,
        error: "Chưa có dữ liệu để chọn nhân viên của ngày",
      };
    }
    setCachedEotd(new Date(), result);
    revalidatePath("/employee-of-the-day");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
