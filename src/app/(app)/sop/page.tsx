import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SopLibrary } from "./sop-library";

export const dynamic = "force-dynamic";

export default async function SopPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-5xl">
      <SopLibrary />
    </div>
  );
}
