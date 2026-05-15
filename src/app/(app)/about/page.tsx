import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Coffee,
  Sparkles,
  Settings,
  Map as MapIcon,
  ArrowRight,
  Languages,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { ABOUT_COPY, resolveLang } from "./copy";
import { FeatureDiscoveryCard } from "@/components/feature-discovery-card";

export const dynamic = "force-dynamic";

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const sp = await searchParams;
  const lang = resolveLang(sp.lang);
  const copy = ABOUT_COPY[lang];
  const totalFeatures = copy.pillars.reduce(
    (sum, p) => sum + p.features.length,
    0,
  );
  const otherLang = lang === "vi" ? "en" : "vi";
  const otherLangLabel = lang === "vi" ? "English" : "Tiếng Việt";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Coffee className="size-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {copy.headlinePrefix}
                </h1>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/about?lang=${otherLang}`}>
                    <Languages className="size-4" />
                    {otherLangLabel}
                  </Link>
                </Button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.tagline(copy.pillars.length, totalFeatures)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Next.js 16</Badge>
                <Badge variant="secondary">React 19</Badge>
                <Badge variant="secondary">PostgreSQL</Badge>
                <Badge variant="secondary">Prisma 7</Badge>
                <Badge variant="secondary">Tailwind v4</Badge>
                <Badge variant="default" className="gap-1">
                  <Sparkles className="size-3" />
                  AI Grok
                </Badge>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/sitemap">
                    <MapIcon className="size-4" />
                    {copy.ctaSitemap}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/help">{copy.ctaHelp}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/changelog">
                    <Sparkles className="size-4" />
                    {copy.ctaChangelog}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/settings">
                    <Settings className="size-4" />
                    {copy.ctaSettings}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {copy.pillars.map((p) => {
          const Icon = p.icon;
          return (
            <Card
              key={p.title}
              className={`overflow-hidden bg-gradient-to-br ${p.tone}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-xl" aria-hidden>
                    {p.emoji}
                  </span>
                  <Icon className="size-4 text-primary" />
                  {p.title}
                </CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link
                    href={
                      lang === "en"
                        ? `${p.href}?lang=en`
                        : p.href
                    }
                  >
                    {p.cta}
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <FeatureDiscoveryCard isAdmin={sess.role === "admin"} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" />
            {copy.techStyleTitle}
          </CardTitle>
          <CardDescription>{copy.techStyleDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          {copy.techNotes.map((note) => (
            <span key={note}>{note}</span>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
