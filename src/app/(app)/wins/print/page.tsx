import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WinsPrintBoard } from "./wins-print-board";

export const dynamic = "force-dynamic";

const MIN_OFFSET = -12;
const MAX_OFFSET = 0;

function parseWeekOffset(value: string | undefined): number {
  if (!value) return 0;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n)) return 0;
  if (n < MIN_OFFSET) return MIN_OFFSET;
  if (n > MAX_OFFSET) return MAX_OFFSET;
  return n;
}

export default async function WinsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ weekOffset?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const weekOffset = parseWeekOffset(sp.weekOffset);

  return (
    <WinsPrintBoard
      weekOffset={weekOffset}
      minOffset={MIN_OFFSET}
      maxOffset={MAX_OFFSET}
    />
  );
}
