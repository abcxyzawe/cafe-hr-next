import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SurveyFiller } from "./survey-filler";

export const dynamic = "force-dynamic";

export default async function SurveyPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const { surveyId } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <SurveyFiller surveyId={surveyId} isAdmin={sess.role === "admin"} />
    </div>
  );
}
