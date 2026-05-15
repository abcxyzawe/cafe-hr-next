import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PersonaForm } from "./persona-form";

export const dynamic = "force-dynamic";

export default async function PersonaPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Users className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                AI Customer Persona Generator
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                Chọn vibe quán, loại địa điểm và phân khúc giá — AI sẽ phác hoạ
                3 chân dung khách hàng tiêu biểu (tên, độ tuổi, nghề nghiệp,
                tần suất ghé quán, đồ uống yêu thích, mục đích, pain points và
                gợi ý marketing) để bạn xây kế hoạch tiếp cận.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PersonaForm />
        </CardContent>
      </Card>
    </div>
  );
}
