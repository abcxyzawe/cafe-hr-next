import { redirect } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SearchBoard } from "./search-board";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SearchIcon className="size-5 text-primary" />
            <div>
              <CardTitle>Tìm kiếm</CardTitle>
              <CardDescription>
                Tìm nhân viên, ca làm và hoạt động trên toàn hệ thống.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SearchBoard />
        </CardContent>
      </Card>
    </div>
  );
}
