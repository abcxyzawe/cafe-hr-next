import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { WinsBoard } from "./wins-board";

export const dynamic = "force-dynamic";

export default async function WinsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <WinsBoard defaultAuthorName={sess.name} />
    </div>
  );
}
