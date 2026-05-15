import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QuickAddFab } from "@/components/layout/quick-add-fab";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts-dialog";
import { SearchPalette } from "@/components/search-palette";
import { VimNav } from "@/components/vim-nav";
import { QuickCheckinShortcut } from "@/components/quick-checkin-shortcut";
import { WhatsNewDialog } from "@/components/whats-new-dialog";
import { OnboardingTour } from "@/components/onboarding-tour";
import { RealtimeToaster } from "@/components/realtime-toaster";
import { AvatarLightbox } from "@/components/avatar-lightbox";
import { EmployeeHoverCard } from "@/components/employee-hover-card";
import { AppFooter } from "@/components/layout/app-footer";
import { FloatingHelpButton } from "@/components/layout/floating-help-button";
import { getCurrentUser } from "@/lib/auth";
import { getLocale, getT } from "@/lib/i18n";
import { recentActivities } from "@/lib/activity";
import { getSidebarBadges } from "@/lib/sidebar-badges";
import { getCurrentPalette } from "@/lib/palette-server";
import { getSidebarCollapsed } from "@/lib/sidebar-state";
import { getCurrentDensity } from "@/lib/density";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const t = await getT();
  const locale = await getLocale();

  // Best-effort fetch for the notification bell — never fail layout if DB hiccups
  let initialActivities: Awaited<ReturnType<typeof recentActivities>> = [];
  try {
    initialActivities = await recentActivities(10);
  } catch {
    initialActivities = [];
  }
  const sidebarBadges = await getSidebarBadges();
  const palette = await getCurrentPalette();
  const sidebarCollapsed = await getSidebarCollapsed();
  const density = await getCurrentDensity();

  // Cheap probe: does this signed-in user have a linked Employee row by email?
  // Used to conditionally show the "Của tôi" sidebar entry. Never breaks layout.
  let hasEmployeeProfile = false;
  try {
    const linked = await prisma.employee.findFirst({
      where: { email: user.email },
      select: { id: true },
    });
    hasEmployeeProfile = linked != null;
  } catch {
    hasEmployeeProfile = false;
  }

  const navLabels = {
    dashboard: t("nav.dashboard"),
    me: t("nav.me"),
    employees: t("nav.employees"),
    shifts: t("nav.shifts"),
    attendance: t("nav.attendance"),
    leave: t("nav.leave"),
    tasks: t("nav.tasks"),
    payroll: t("nav.payroll"),
    reports: t("nav.reports"),
    peopleCalendar: t("nav.peopleCalendar"),
    audit: t("nav.audit"),
    settings: t("nav.settings"),
    changelog: t("nav.changelog"),
  };

  const topbarTitles = {
    "/": t("topbar.dashboard"),
    "/me": t("topbar.me"),
    "/employees": t("topbar.employees"),
    "/shifts": t("topbar.shifts"),
    "/attendance": t("topbar.attendance"),
    "/leave": t("topbar.leave"),
    "/tasks": t("topbar.tasks"),
    "/payroll": t("topbar.payroll"),
    "/reports": t("topbar.reports"),
    "/people-calendar": t("topbar.peopleCalendar"),
    "/audit": t("topbar.audit"),
    "/settings": t("topbar.settings"),
    "/changelog": t("topbar.changelog"),
  };

  const userMenuLabels = {
    adminBadge: t("common.adminBadge"),
    staffBadge: t("common.staffBadge"),
    accountSettings: t("common.accountSettings"),
    signOut: t("common.signOut"),
  };

  return (
    <>
      <Sidebar
        labels={navLabels}
        appName={t("app.name")}
        appTagline={t("app.tagline")}
        badges={sidebarBadges}
        collapsed={sidebarCollapsed}
        isAdmin={user.role === "admin"}
        hasEmployeeProfile={hasEmployeeProfile}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          user={{ uid: user.id, name: user.name, email: user.email, role: user.role }}
          titles={topbarTitles}
          userMenuLabels={userMenuLabels}
          locale={locale}
          initialActivities={initialActivities.map((a) => ({
            id: a.id,
            action: a.action,
            summary: a.summary,
            createdAt: a.createdAt,
            user: a.user,
          }))}
          paletteId={palette.id}
          density={density}
        />
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-10">
          <div key={user.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
            {children}
          </div>
        </main>
        <AppFooter />
      </div>
      <MobileNav
        labels={navLabels}
        badges={sidebarBadges}
        isAdmin={user.role === "admin"}
        hasEmployeeProfile={hasEmployeeProfile}
      />
      <QuickAddFab isAdmin={user.role === "admin"} />
      <KeyboardShortcutsDialog />
      <SearchPalette isAdmin={user.role === "admin"} />
      <FloatingHelpButton />
      <VimNav />
      <QuickCheckinShortcut hasEmployeeProfile={hasEmployeeProfile} />
      <WhatsNewDialog />
      <OnboardingTour isAdmin={user.role === "admin"} />
      <RealtimeToaster currentUserId={user.id} />
      <AvatarLightbox />
      <EmployeeHoverCard isAdmin={user.role === "admin"} />
    </>
  );
}
