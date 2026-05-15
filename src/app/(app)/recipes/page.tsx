import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Coffee } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/auth";
import {
  RECIPES,
  CATEGORY_LABEL,
  type RecipeCategory,
} from "@/lib/recipe-catalogue";
import { RecipeCard } from "./recipe-card";

export const dynamic = "force-dynamic";

const ALL_CATEGORIES: RecipeCategory[] = ["espresso", "milk", "cold", "tea"];

function isCategory(value: string | undefined): value is RecipeCategory {
  return (
    value === "espresso" ||
    value === "milk" ||
    value === "cold" ||
    value === "tea"
  );
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const activeCategory: RecipeCategory | null = isCategory(sp.category)
    ? sp.category
    : null;

  const filtered = activeCategory
    ? RECIPES.filter((r) => r.category === activeCategory)
    : RECIPES;

  const counts: Record<RecipeCategory, number> = {
    espresso: 0,
    milk: 0,
    cold: 0,
    tea: 0,
  };
  for (const r of RECIPES) counts[r.category]++;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-50 via-background to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <BookOpen className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl tracking-tight md:text-3xl">
                Sổ tay pha chế
              </CardTitle>
              <CardDescription className="mt-1">
                Bộ công thức pha chế cốt lõi cho barista quán: từ espresso
                truyền thống đến cà phê phin Việt và trà sữa. Bấm &quot;Mẹo của
                AI&quot; trên từng thẻ để xin head barista mẹo nâng cấp tay
                nghề.
              </CardDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Coffee className="size-3" />
                  {RECIPES.length} công thức
                </Badge>
                {activeCategory ? (
                  <Badge variant="outline">
                    Đang lọc: {CATEGORY_LABEL[activeCategory]} ·{" "}
                    {filtered.length} công thức
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4">
          <span className="text-xs font-medium text-muted-foreground">
            Lọc theo nhóm:
          </span>
          <FilterChip
            href="/recipes"
            label="Tất cả"
            count={RECIPES.length}
            active={activeCategory === null}
          />
          {ALL_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat}
              href={`/recipes?category=${cat}`}
              label={CATEGORY_LABEL[cat]}
              count={counts[cat]}
              active={activeCategory === cat}
            />
          ))}
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Chưa có công thức nào trong nhóm này.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-input bg-background text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
          active ? "bg-primary-foreground/20" : "bg-muted",
        )}
      >
        {count}
      </span>
    </Link>
  );
}
