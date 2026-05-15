import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { QuizBoard } from "./quiz-board";

export const dynamic = "force-dynamic";

export default async function QuizPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl md:text-3xl">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <GraduationCap className="size-5" />
            </span>
            Bài kiểm tra nhanh
          </CardTitle>
          <CardDescription>
            AI sẽ tạo 5 câu trắc nghiệm về quy trình quán và công thức pha chế
            để bạn ôn tập kiến thức nhanh.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Chọn chủ đề, bấm <span className="font-medium">Tạo bài quiz</span>,
          làm bài và xem kết quả kèm giải thích cho từng câu.
        </CardContent>
      </Card>

      <QuizBoard />
    </div>
  );
}
