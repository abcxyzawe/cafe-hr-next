import { redirect } from "next/navigation";
import { Layers } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ValuePropForm } from "./value-prop-form";

export const dynamic = "force-dynamic";

export default async function ValuePropPage() {
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
              <Layers className="size-5" />
            </span>
            Value Proposition Canvas AI
          </CardTitle>
          <CardDescription>
            Nhập phân khúc khách hàng mục tiêu và mô tả sản phẩm/dịch vụ của
            quán. AI sẽ dựng bản đồ giá trị theo khung Strategyzer với hai
            cột: hồ sơ khách hàng (công việc, nỗi đau, niềm vui) và bản đồ
            giá trị (sản phẩm, giảm đau, tạo niềm vui).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ValuePropForm />
        </CardContent>
      </Card>
    </div>
  );
}
