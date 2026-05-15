import { cookies } from "next/headers";

export type Density = "comfortable" | "compact";

export const DENSITY_COOKIE = "cafe-hr-density";
export const DEFAULT_DENSITY: Density = "comfortable";

export function isDensity(v: string | undefined): v is Density {
  return v === "comfortable" || v === "compact";
}

export async function getCurrentDensity(): Promise<Density> {
  const c = await cookies();
  const v = c.get(DENSITY_COOKIE)?.value;
  return isDensity(v) ? v : DEFAULT_DENSITY;
}
