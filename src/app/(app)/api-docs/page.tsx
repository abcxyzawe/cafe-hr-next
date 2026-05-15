import { redirect } from "next/navigation";
import {
  Code2,
  Database,
  ShieldCheck,
  Wallet,
  Users,
  Calendar,
  ListChecks,
  Plane,
  ScrollText,
  Activity,
  Sparkles,
  Coffee,
  Globe,
  Bell,
  Cake,
  Package,
  Wrench,
  MessageSquareHeart,
  StickyNote,
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

export const dynamic = "force-dynamic";

type Endpoint = {
  method: "GET" | "POST";
  path: string;
  desc: string;
  auth: "public" | "session" | "admin";
  query?: string;
};

type ApiGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  endpoints: Endpoint[];
};

const GROUPS: ApiGroup[] = [
  {
    title: "Hệ thống",
    icon: Activity,
    endpoints: [
      { method: "GET", path: "/api/health", desc: "Trạng thái DB + xAI + memory + uptime", auth: "public" },
      { method: "GET", path: "/api/version", desc: "Tên, version, runtime, commit", auth: "public" },
      { method: "GET", path: "/api/openapi.json", desc: "OpenAPI spec (force-static)", auth: "public" },
    ],
  },
  {
    title: "Dashboard tổng hợp",
    icon: Database,
    endpoints: [
      { method: "GET", path: "/api/stats", desc: "Aggregate counts (employees, shifts, attendance, payroll, todo)", auth: "session" },
      { method: "GET", path: "/api/dashboard", desc: "Snapshot toàn diện cho trang chủ", auth: "admin" },
      { method: "GET", path: "/api/all-stats", desc: "Combined dashboard + today + birthdays", auth: "admin" },
      { method: "GET", path: "/api/today", desc: "Lịch ca hôm nay + attendance + leaves", auth: "admin" },
      { method: "GET", path: "/api/standup", desc: "Standup facts + cached AI summary", auth: "admin" },
    ],
  },
  {
    title: "Nhân viên & quản lý",
    icon: Users,
    endpoints: [
      { method: "GET", path: "/api/employees", desc: "Cursor-paginated employees + role/q filters", auth: "admin", query: "?limit=&cursor=&role=&q=" },
      { method: "GET", path: "/api/employee-preview/[id]", desc: "Hover-preview data cho avatar links", auth: "session" },
      { method: "GET", path: "/api/employees/lookup", desc: "Quick lookup by email/phone", auth: "session" },
      { method: "GET", path: "/api/employees/csv", desc: "CSV export of employees", auth: "admin" },
      { method: "GET", path: "/api/employees/template.csv", desc: "Template for bulk import", auth: "public" },
      { method: "GET", path: "/api/me", desc: "User + linked employee + week/month stats", auth: "session" },
      { method: "GET", path: "/api/me/timeline", desc: "Personal merged activity feed", auth: "session" },
      { method: "GET", path: "/api/me/clocked-in", desc: "Currently-on-shift status", auth: "session" },
      { method: "GET", path: "/api/me/shifts.ics", desc: "iCalendar export of upcoming shifts", auth: "session" },
    ],
  },
  {
    title: "Vận hành ca",
    icon: Calendar,
    endpoints: [
      { method: "GET", path: "/api/shifts", desc: "Cursor-paginated shifts + filters", auth: "admin", query: "?from=&to=&shiftType=&employeeId=" },
      { method: "GET", path: "/api/shifts/calendar.ics", desc: "iCalendar export of all shifts", auth: "admin" },
      { method: "GET", path: "/api/shifts/template.csv", desc: "Bulk import template", auth: "public" },
      { method: "GET", path: "/api/attendance", desc: "Cursor-paginated attendance", auth: "admin", query: "?from=&to=&employeeId=&openOnly=1" },
      { method: "GET", path: "/api/attendance/csv", desc: "CSV export", auth: "admin" },
    ],
  },
  {
    title: "Lương & tài chính",
    icon: Wallet,
    endpoints: [
      { method: "GET", path: "/api/payroll", desc: "Snapshot rows for ?period=YYYY-MM", auth: "admin" },
      { method: "GET", path: "/api/payroll/[period]/csv", desc: "Per-period CSV export", auth: "admin" },
      { method: "GET", path: "/api/payroll/[period]/export", desc: "Per-period Excel export", auth: "admin" },
    ],
  },
  {
    title: "Nghỉ phép & tasks",
    icon: Plane,
    endpoints: [
      { method: "GET", path: "/api/leaves", desc: "Cursor-paginated leaves", auth: "admin", query: "?status=&type=&employeeId=" },
      { method: "GET", path: "/api/leave/csv", desc: "CSV export", auth: "admin" },
      { method: "GET", path: "/api/leave-balance", desc: "Per-employee annual+sick balances", auth: "admin" },
      { method: "GET", path: "/api/tasks", desc: "Cursor-paginated tasks", auth: "admin", query: "?status=open|done&assignedTo=" },
      { method: "GET", path: "/api/tasks/csv", desc: "CSV export", auth: "admin" },
    ],
  },
  {
    title: "Phân tích & log",
    icon: ScrollText,
    endpoints: [
      { method: "GET", path: "/api/notes", desc: "Cursor-paginated notes + keyword search", auth: "admin", query: "?employeeId=&q=" },
      { method: "GET", path: "/api/announcements", desc: "Broadcast history with cursor + severity", auth: "session" },
      { method: "GET", path: "/api/activity/export", desc: "Activity log CSV", auth: "admin" },
      { method: "GET", path: "/api/activity/stream", desc: "SSE realtime activity", auth: "session" },
      { method: "GET", path: "/api/quotes", desc: "Daily quotes paginated", auth: "admin" },
      { method: "GET", path: "/api/feedback", desc: "Customer + user feedback", auth: "admin", query: "?source=customer|user" },
      { method: "GET", path: "/api/feedback/csv", desc: "Feedback CSV export", auth: "admin" },
      { method: "GET", path: "/api/search", desc: "Universal search", auth: "session", query: "?q=" },
    ],
  },
  {
    title: "Catalogues (public)",
    icon: Coffee,
    endpoints: [
      { method: "GET", path: "/api/sop", desc: "Standard operating procedures", auth: "public" },
      { method: "GET", path: "/api/recipes", desc: "Drink recipe catalogue", auth: "public" },
      { method: "GET", path: "/api/equipment-presets", desc: "Default equipment items", auth: "public" },
      { method: "GET", path: "/api/inventory-presets", desc: "Default inventory items", auth: "public" },
      { method: "GET", path: "/api/holidays", desc: "VN holidays for ?year=", auth: "public" },
      { method: "GET", path: "/api/changelog", desc: "Version history", auth: "public" },
    ],
  },
  {
    title: "Sự kiện & sinh nhật",
    icon: Cake,
    endpoints: [
      { method: "GET", path: "/api/birthdays", desc: "Upcoming birthdays in ?days= window", auth: "admin" },
    ],
  },
  {
    title: "Snapshot endpoints (POST)",
    icon: Package,
    endpoints: [
      { method: "POST", path: "/api/inventory/snapshot", desc: "Validate localStorage inventory + low-stock alerts", auth: "admin" },
      { method: "POST", path: "/api/equipment/snapshot", desc: "Equipment status (ok/due-soon/overdue)", auth: "admin" },
      { method: "POST", path: "/api/sustainability/snapshot", desc: "Validate eco days + acceptance rate", auth: "admin" },
      { method: "POST", path: "/api/reviews/snapshot", desc: "Reviews avg + distribution + alerts", auth: "admin" },
      { method: "POST", path: "/api/wins", desc: "Wins payload validate + tally", auth: "session" },
    ],
  },
  {
    title: "PWA / kiosk / presence",
    icon: Bell,
    endpoints: [
      { method: "GET", path: "/api/kiosk/stream", desc: "SSE for kiosk live feed", auth: "public" },
      { method: "GET", path: "/api/presence/stream", desc: "SSE for who's online", auth: "session" },
      { method: "POST", path: "/api/presence/heartbeat", desc: "Heartbeat ping", auth: "session" },
    ],
  },
];

const AUTH_TONE: Record<Endpoint["auth"], string> = {
  public: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  session: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  admin: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
};

const METHOD_TONE: Record<Endpoint["method"], string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  POST: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

export default async function ApiDocsPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");

  const totalEndpoints = GROUPS.reduce(
    (sum, g) => sum + g.endpoints.length,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-primary/15 via-accent/30 to-background">
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <Code2 className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                API tham chiếu
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalEndpoints} endpoints qua {GROUPS.length} nhóm. Mọi endpoint
                authenticated dùng cookie session từ <code>/login</code>.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href="/api/openapi.json" target="_blank" rel="noreferrer">
                    Mở openapi.json
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="/api/health" target="_blank" rel="noreferrer">
                    <ShieldCheck className="size-4" />
                    /api/health
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="/api/version" target="_blank" rel="noreferrer">
                    /api/version
                  </a>
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge className={AUTH_TONE.public}>public</Badge>
                <Badge className={AUTH_TONE.session}>session</Badge>
                <Badge className={AUTH_TONE.admin}>admin</Badge>
                <span className="opacity-60">· nhãn quyền truy cập</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {GROUPS.map((group) => {
        const Icon = group.icon;
        return (
          <Card key={group.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="size-4 text-primary" />
                {group.title}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {group.endpoints.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                {group.endpoints.length} endpoint{" "}
                {group.endpoints.every((e) => e.method === "GET") ? "GET" : "GET/POST"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {group.endpoints.map((ep) => (
                  <li
                    key={`${ep.method}-${ep.path}`}
                    className="flex flex-wrap items-baseline gap-2 py-2 text-sm"
                  >
                    <Badge className={METHOD_TONE[ep.method]}>{ep.method}</Badge>
                    <code className="font-mono text-xs sm:text-sm">{ep.path}</code>
                    {ep.query && (
                      <code className="font-mono text-[11px] text-muted-foreground">
                        {ep.query}
                      </code>
                    )}
                    <Badge className={`${AUTH_TONE[ep.auth]} text-[10px]`}>
                      {ep.auth}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {ep.desc}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Sparkles className="size-4 text-primary" />
            Mẹo dùng API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-xs text-muted-foreground">
          <p>• Dùng cookie session từ trình duyệt (đăng nhập trước trên Cafe HR rồi copy cookie sang Postman/Bruno).</p>
          <p>• Cursor pagination: gửi <code>?cursor=&lt;id&gt;</code> với id của entry cuối cùng để lấy trang tiếp theo.</p>
          <p>• Snapshot endpoints (POST) chỉ validate, không persist — dữ liệu chính nằm trong localStorage browser.</p>
          <p>• Catalogues là <code>force-static</code> với cache 1h — gọi nhiều không tốn DB.</p>
        </CardContent>
      </Card>
    </div>
  );
}
