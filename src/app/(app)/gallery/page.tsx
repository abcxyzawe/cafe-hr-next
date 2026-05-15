import { redirect } from "next/navigation";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { Images, Sparkles, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GalleryGrid, type IllustrationItem, type AvatarItem } from "./gallery-grid";

export const dynamic = "force-dynamic";

const KNOWN_PREFIXES = [
  "empty",
  "error",
  "role",
  "onboarding",
  "login",
] as const;

function deriveCategory(filename: string): string {
  const base = filename.replace(/\.png$/i, "");
  const dash = base.indexOf("-");
  if (dash <= 0) return "other";
  const prefix = base.slice(0, dash);
  return (KNOWN_PREFIXES as readonly string[]).includes(prefix) ? prefix : "other";
}

async function listIllustrations(): Promise<IllustrationItem[]> {
  try {
    const dir = path.join(process.cwd(), "public", "illustrations");
    const files = await readdir(dir);
    return files
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .sort((a, b) => a.localeCompare(b))
      .map<IllustrationItem>((name) => ({
        name,
        src: `/illustrations/${name}`,
        category: deriveCategory(name),
      }));
  } catch {
    return [];
  }
}

async function listAvatars(): Promise<AvatarItem[]> {
  try {
    const rows = await prisma.employee.findMany({
      where: { avatarUrl: { not: null } },
      select: { id: true, name: true, role: true, avatarUrl: true },
      orderBy: { name: "asc" },
    });
    return rows
      .filter((r): r is typeof r & { avatarUrl: string } => Boolean(r.avatarUrl))
      .map<AvatarItem>((r) => ({
        id: r.id,
        name: r.name,
        role: r.role,
        src: r.avatarUrl,
      }));
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");

  const [illustrations, avatars] = await Promise.all([
    listIllustrations(),
    listAvatars(),
  ]);

  const total = illustrations.length + avatars.length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Images className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Thư viện minh họa AI</CardTitle>
                <CardDescription className="mt-1">
                  Toàn bộ minh họa hệ thống và avatar nhân viên do AI sinh.
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {total} ảnh
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
              <Sparkles className="size-3.5" /> Minh họa: {illustrations.length}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1">
              <Users className="size-3.5" /> Avatar nhân viên: {avatars.length}
            </span>
          </div>
        </CardContent>
      </Card>

      <GalleryGrid illustrations={illustrations} avatars={avatars} />
    </div>
  );
}
