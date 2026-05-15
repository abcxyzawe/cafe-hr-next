import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { EquipmentPrintBoard } from "./equipment-print-board";

export const dynamic = "force-dynamic";

export default async function EquipmentPrintPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  return <EquipmentPrintBoard />;
}
