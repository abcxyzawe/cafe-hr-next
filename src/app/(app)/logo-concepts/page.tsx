import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogoForm } from "./logo-form";

export const dynamic = "force-dynamic";

export default async function LogoConceptsPage() {
  const sess = await getSession();
  if (!sess || sess.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Sparkles className="size-5" />
            </span>
            Tạo logo concept AI
          </CardTitle>
          <CardDescription>
            Nhập tên quán, chọn vibe và loại biểu tượng — AI sẽ phác 3 phương án
            logo song song với 3 bố cục khác nhau (mark trung tâm, lockup
            ngang, badge huy hiệu) để bạn so sánh và tải về.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoForm />
        </CardContent>
      </Card>
    </div>
  );
}
