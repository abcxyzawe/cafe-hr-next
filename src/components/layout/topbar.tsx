"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "./user-menu";
import { CommandPalette } from "@/components/command-palette";
import { NotificationBell } from "./notification-bell";
import { PresenceIndicator } from "./presence-indicator";
import { HelpButton } from "./help-button";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { AnnouncementComposerDialog } from "@/components/announcement-composer-dialog";
import type { Locale } from "@/lib/i18n";
import type { PaletteId } from "@/lib/palette";
import type { Density } from "@/lib/density";

type UserMenuLabels = {
  adminBadge: string;
  staffBadge: string;
  accountSettings: string;
  signOut: string;
};

type Activity = {
  id: number;
  action: string;
  summary: string;
  createdAt: Date;
  user: { id: number; name: string; email: string; role: string } | null;
};

type Props = {
  user: { uid: number; name: string; email: string; role: "admin" | "staff" };
  titles: Record<string, string>;
  userMenuLabels: UserMenuLabels;
  locale: Locale;
  initialActivities: Activity[];
  paletteId: PaletteId;
  density: Density;
};

export function TopBar({
  user,
  titles,
  userMenuLabels,
  locale,
  initialActivities,
  paletteId,
  density,
}: Props) {
  const pathname = usePathname();
  const title =
    Object.entries(titles).find(([k]) =>
      k === "/" ? pathname === "/" : pathname.startsWith(k),
    )?.[1] ?? "Cafe HR";
  const [dateLabel, setDateLabel] = useState<string>("");
  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    );
  }, [locale]);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 lg:hidden">
          <Image src="/brand/logo-48.png" alt="Cafe HR" width={24} height={24} className="rounded" />
          <span className="font-bold">Cafe HR</span>
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CommandPalette />
        <span className="hidden xl:inline">{dateLabel}</span>
        <PresenceIndicator currentUid={user.uid} />
        <NotificationBell initial={initialActivities} />
        <FeedbackDialog />
        <AnnouncementComposerDialog isAdmin={user.role === "admin"} />
        <HelpButton />
        <ThemeToggle />
        <UserMenu user={user} labels={userMenuLabels} locale={locale} paletteId={paletteId} density={density} />
      </div>
    </header>
  );
}
