import { cookies, headers } from "next/headers";

export type Locale = "vi" | "en";
export const LOCALES: Locale[] = ["vi", "en"];
export const DEFAULT_LOCALE: Locale = "vi";
export const LOCALE_COOKIE = "cafe-hr-locale";

const dictionaries = {
  vi: {
    "app.name": "Cafe HR",
    "app.tagline": "Quản lý nhân sự quán cà phê",

    "nav.dashboard": "Tổng quan",
    "nav.me": "Của tôi",
    "nav.employees": "Nhân viên",
    "nav.shifts": "Ca làm",
    "nav.attendance": "Chấm công",
    "nav.leave": "Nghỉ phép",
    "nav.tasks": "Công việc",
    "nav.payroll": "Lương",
    "nav.reports": "Báo cáo",
    "nav.peopleCalendar": "Lịch sự kiện",
    "nav.audit": "Nhật ký",
    "nav.settings": "Cài đặt",
    "nav.changelog": "Cập nhật",

    "topbar.dashboard": "Tổng quan",
    "topbar.me": "Của tôi",
    "topbar.employees": "Nhân viên",
    "topbar.shifts": "Lịch ca làm",
    "topbar.attendance": "Chấm công",
    "topbar.leave": "Nghỉ phép",
    "topbar.tasks": "Công việc",
    "topbar.payroll": "Bảng lương",
    "topbar.reports": "Báo cáo & phân tích",
    "topbar.peopleCalendar": "Lịch sự kiện đội",
    "topbar.audit": "Nhật ký hệ thống",
    "topbar.settings": "Cài đặt",
    "topbar.changelog": "Có gì mới?",

    "common.search": "Tìm kiếm...",
    "common.loading": "Đang tải...",
    "common.save": "Lưu",
    "common.cancel": "Huỷ",
    "common.delete": "Xoá",
    "common.edit": "Sửa",
    "common.signOut": "Đăng xuất",
    "common.accountSettings": "Cài đặt tài khoản",
    "common.adminBadge": "Quản trị viên",
    "common.staffBadge": "Nhân viên",

    "login.signInButton": "Đăng nhập",
    "login.email": "Email",
    "login.password": "Mật khẩu",
    "login.demoHint": "Tài khoản demo",
    "login.tagline": "Quản lý nhân sự quán cà phê,\ntheo cách của riêng bạn.",
    "login.subtitle":
      "Theo dõi đội ngũ, lập lịch ca, chấm công và tính lương — gọn gàng trong một giao diện hiện đại.",
    "login.formTitle": "Đăng nhập để tiếp tục quản lý",
    "login.errorInvalid": "Email hoặc mật khẩu không đúng",
    "login.errorTooMany": "Quá nhiều lần thử. Vui lòng đợi {seconds}s.",

    "dashboard.heroBadge": "Bảng điều khiển",
    "dashboard.heroTitle1": "Quản lý nhân sự quán cà phê",
    "dashboard.heroTitle2": "gọn gàng",
    "dashboard.heroSubtitle":
      "Theo dõi nhân viên, lập lịch ca, chấm công và tính lương — tất cả trong một giao diện hiện đại, đầy đủ chức năng cho quán cà phê hằng ngày.",
    "dashboard.manageEmployees": "Quản lý nhân viên",
    "dashboard.viewPayroll": "Xem bảng lương",
    "dashboard.statEmployees": "Nhân viên",
    "dashboard.statShiftsToday": "Ca hôm nay",
    "dashboard.statOpenAttendance": "Đang làm việc",
    "dashboard.statMonthHours": "Giờ làm tháng",
    "dashboard.recentEmployees": "Nhân viên mới",
    "dashboard.recentEmployeesDesc": "5 nhân viên được thêm gần đây",
    "dashboard.viewAll": "Xem tất cả",
    "dashboard.recentActivity": "Hoạt động gần đây",
    "dashboard.recentActivityDesc": "Audit trail của thao tác trong hệ thống",
    "dashboard.rolesTitle": "Vai trò trong quán",
    "dashboard.rolesDesc": "4 vị trí công việc chính",
  },

  en: {
    "app.name": "Cafe HR",
    "app.tagline": "Coffee shop HR management",

    "nav.dashboard": "Dashboard",
    "nav.me": "My day",
    "nav.employees": "Employees",
    "nav.shifts": "Shifts",
    "nav.attendance": "Attendance",
    "nav.leave": "Leave",
    "nav.tasks": "Tasks",
    "nav.payroll": "Payroll",
    "nav.reports": "Reports",
    "nav.peopleCalendar": "People calendar",
    "nav.audit": "Audit log",
    "nav.settings": "Settings",
    "nav.changelog": "Changelog",

    "topbar.dashboard": "Dashboard",
    "topbar.me": "My day",
    "topbar.employees": "Employees",
    "topbar.shifts": "Shift schedule",
    "topbar.attendance": "Attendance",
    "topbar.leave": "Leave",
    "topbar.tasks": "Tasks",
    "topbar.payroll": "Payroll",
    "topbar.reports": "Reports & analytics",
    "topbar.peopleCalendar": "People calendar",
    "topbar.audit": "System audit log",
    "topbar.settings": "Settings",
    "topbar.changelog": "What's new?",

    "common.search": "Search...",
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.signOut": "Sign out",
    "common.accountSettings": "Account settings",
    "common.adminBadge": "Administrator",
    "common.staffBadge": "Staff",

    "login.signInButton": "Sign in",
    "login.email": "Email",
    "login.password": "Password",
    "login.demoHint": "Demo account",
    "login.tagline": "Coffee shop HR,\non your own terms.",
    "login.subtitle":
      "Track your team, schedule shifts, clock in/out, and run payroll — all in one tidy modern interface.",
    "login.formTitle": "Sign in to continue",
    "login.errorInvalid": "Invalid email or password",
    "login.errorTooMany": "Too many attempts. Wait {seconds}s.",

    "dashboard.heroBadge": "Dashboard",
    "dashboard.heroTitle1": "Coffee shop HR,",
    "dashboard.heroTitle2": "made tidy",
    "dashboard.heroSubtitle":
      "Track employees, schedule shifts, log attendance, and run payroll — all in one modern, focused UI built for daily café operations.",
    "dashboard.manageEmployees": "Manage employees",
    "dashboard.viewPayroll": "View payroll",
    "dashboard.statEmployees": "Employees",
    "dashboard.statShiftsToday": "Shifts today",
    "dashboard.statOpenAttendance": "On shift",
    "dashboard.statMonthHours": "Hours this month",
    "dashboard.recentEmployees": "New employees",
    "dashboard.recentEmployeesDesc": "5 most recently added",
    "dashboard.viewAll": "View all",
    "dashboard.recentActivity": "Recent activity",
    "dashboard.recentActivityDesc": "Audit trail of system operations",
    "dashboard.rolesTitle": "Roles in the shop",
    "dashboard.rolesDesc": "4 core positions",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type TranslationKey = keyof (typeof dictionaries)["vi"];

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const fromCookie = c.get(LOCALE_COOKIE)?.value;
  if (fromCookie === "vi" || fromCookie === "en") return fromCookie;

  // Negotiate from Accept-Language
  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  if (/\ben\b/i.test(accept) && !/\bvi\b/i.test(accept)) return "en";
  return DEFAULT_LOCALE;
}

export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  let str = (dict[key] as string | undefined) ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}

export async function getT(): Promise<
  (key: TranslationKey, vars?: Record<string, string | number>) => string
> {
  const locale = await getLocale();
  return (key, vars) => translate(locale, key, vars);
}
