import { redirect } from "next/navigation";
import { Shirt } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UniformForm } from "./uniform-form";

export const dynamic = "force-dynamic";

export default async function UniformDesignPage() {
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
              <Shirt className="size-5" />
            </span>
            Thiết kế đồng phục nhân viên AI
          </CardTitle>
          <CardDescription>
            Chọn vị trí, phong cách và màu chủ đạo — AI sẽ phác thảo 3 concept
            đồng phục theo các góc nhìn khác nhau (chính diện, cận cảnh phụ
            kiện, nghiêng 3/4) để bạn duyệt và làm brief cho xưởng may.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UniformForm />
        </CardContent>
      </Card>
    </div>
  );
}
