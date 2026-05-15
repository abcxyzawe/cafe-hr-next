import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { Mail, Inbox, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { gatherDigestData, type DigestData } from "@/lib/digest-data";
import { CopyHtmlButton } from "./copy-html-button";

export const dynamic = "force-dynamic";

const PREVIEW_ID = "email-preview-root";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatVnDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// ---- Email-safe inline style objects ---------------------------------------
// Real email clients strip <style>, ignore CSS variables, and many flex/grid
// properties. We therefore: (1) use <table> for layout, (2) inline every
// style with hard-coded colors / px sizes, (3) cap width at 600px.

const ESPRESSO = "#3b2415";
const COFFEE = "#5a3a25";
const AMBER = "#d97706";
const AMBER_DARK = "#b45309";
const CREAM = "#fff8ec";
const SLATE_500 = "#64748b";
const SLATE_700 = "#334155";
const BORDER = "#e7d9c4";

const wrapperStyle: CSSProperties = {
  width: "100%",
  maxWidth: 600,
  margin: "0 auto",
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  color: ESPRESSO,
  borderCollapse: "collapse",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  overflow: "hidden",
};

const headerCellStyle: CSSProperties = {
  padding: "20px 24px",
  background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DARK} 100%)`,
  color: "#ffffff",
};

const subjectStyle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "0.2px",
  lineHeight: "1.3",
};

const subjectMetaStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 12,
  opacity: 0.9,
};

const sectionCellStyle: CSSProperties = {
  padding: "20px 24px",
  borderTop: `1px solid ${BORDER}`,
  backgroundColor: "#ffffff",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 8px 0",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  color: AMBER_DARK,
};

const paraStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: "1.55",
  color: COFFEE,
};

const kpiOuterStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 8,
};

const kpiCellStyle: CSSProperties = {
  width: "50%",
  padding: 12,
  backgroundColor: CREAM,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  verticalAlign: "top",
};

const kpiLabelStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  color: SLATE_500,
};

const kpiValueStyle: CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 22,
  fontWeight: 700,
  color: ESPRESSO,
  fontVariantNumeric: "tabular-nums",
};

const streakRowStyle: CSSProperties = {
  padding: "10px 12px",
  backgroundColor: CREAM,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  marginBottom: 6,
};

const streakNameStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: ESPRESSO,
};

const streakMetaStyle: CSSProperties = {
  margin: "2px 0 0 0",
  fontSize: 12,
  color: SLATE_500,
};

const footerCellStyle: CSSProperties = {
  padding: "16px 24px",
  backgroundColor: "#f7efe1",
  borderTop: `1px solid ${BORDER}`,
};

const footerTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: SLATE_700,
  lineHeight: "1.5",
};

const unsubLinkStyle: CSSProperties = {
  color: AMBER_DARK,
  textDecoration: "underline",
};

// ---- Components ------------------------------------------------------------

type Kpi = { label: string; value: number };

function buildKpis(d: DigestData): Kpi[] {
  return [
    { label: "Nhân viên", value: d.employeeCount },
    { label: "Chấm công hôm nay", value: d.attendanceToday },
    { label: "Chưa check-out", value: d.openAttendance },
    { label: "Đơn nghỉ chờ duyệt", value: d.pendingLeaves },
  ];
}

function EmailPreview({
  data,
  today,
}: {
  data: DigestData;
  today: Date;
}): React.ReactElement {
  const kpis = buildKpis(data);
  const subject = `Cafe HR · Tóm tắt ${formatVnDate(today)}`;

  return (
    <table
      id={PREVIEW_ID}
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={wrapperStyle}
    >
      <tbody>
        {/* Header */}
        <tr>
          <td style={headerCellStyle}>
            <table
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle" }}>
                    <p style={subjectStyle}>{subject}</p>
                    <p style={subjectMetaStyle}>
                      Bản tóm tắt vận hành quán cà phê hằng ngày
                    </p>
                  </td>
                  <td
                    style={{
                      verticalAlign: "middle",
                      textAlign: "right",
                      width: 56,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 40,
                        height: 40,
                        lineHeight: "40px",
                        textAlign: "center",
                        backgroundColor: "#ffffff",
                        color: AMBER_DARK,
                        borderRadius: 20,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      ☕
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>

        {/* Standup briefing */}
        <tr>
          <td style={sectionCellStyle}>
            <p style={sectionTitleStyle}>Briefing đầu ngày</p>
            <p style={paraStyle}>
              {data.standupSummary ??
                "Chưa có briefing cho hôm nay. Vào trang Standup để tạo bản tóm tắt AI."}
            </p>
          </td>
        </tr>

        {/* KPI tiles */}
        <tr>
          <td style={sectionCellStyle}>
            <p style={sectionTitleStyle}>Chỉ số hôm nay</p>
            <table
              cellPadding={0}
              cellSpacing={0}
              role="presentation"
              style={kpiOuterStyle}
            >
              <tbody>
                <tr>
                  <td style={kpiCellStyle}>
                    <p style={kpiLabelStyle}>{kpis[0].label}</p>
                    <p style={kpiValueStyle}>{kpis[0].value}</p>
                  </td>
                  <td style={kpiCellStyle}>
                    <p style={kpiLabelStyle}>{kpis[1].label}</p>
                    <p style={kpiValueStyle}>{kpis[1].value}</p>
                  </td>
                </tr>
                <tr>
                  <td style={kpiCellStyle}>
                    <p style={kpiLabelStyle}>{kpis[2].label}</p>
                    <p style={kpiValueStyle}>{kpis[2].value}</p>
                  </td>
                  <td style={kpiCellStyle}>
                    <p style={kpiLabelStyle}>{kpis[3].label}</p>
                    <p style={kpiValueStyle}>{kpis[3].value}</p>
                  </td>
                </tr>
              </tbody>
            </table>
            {data.birthdaysToday > 0 && (
              <p
                style={{
                  margin: "10px 0 0 0",
                  fontSize: 13,
                  color: AMBER_DARK,
                }}
              >
                🎂 Hôm nay có {data.birthdaysToday} nhân viên sinh nhật.
              </p>
            )}
          </td>
        </tr>

        {/* Top streaks */}
        <tr>
          <td style={sectionCellStyle}>
            <p style={sectionTitleStyle}>Top 3 streak chấm công</p>
            {data.topStreaks.length === 0 ? (
              <p style={paraStyle}>Chưa có streak nào đang hoạt động.</p>
            ) : (
              <table
                cellPadding={0}
                cellSpacing={0}
                role="presentation"
                style={{ width: "100%", borderCollapse: "separate" }}
              >
                <tbody>
                  {data.topStreaks.map((s, i) => (
                    <tr key={`${s.name}-${i}`}>
                      <td style={{ paddingBottom: 6 }}>
                        <div style={streakRowStyle}>
                          <p style={streakNameStyle}>
                            {i + 1}. {s.name}
                          </p>
                          <p style={streakMetaStyle}>
                            Hiện tại: {s.current} ngày · Kỷ lục: {s.longest}{" "}
                            ngày
                          </p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>

        {/* Footer */}
        <tr>
          <td style={footerCellStyle}>
            <p style={footerTextStyle}>
              Bạn nhận được email này vì đăng ký bản tin Cafe HR. Tạo lúc{" "}
              {data.generatedAt.toLocaleString("vi-VN")}.
            </p>
            <p style={{ ...footerTextStyle, marginTop: 6 }}>
              <a href="#unsubscribe" style={unsubLinkStyle}>
                Hủy đăng ký
              </a>
              {" · "}
              <a href="#preferences" style={unsubLinkStyle}>
                Tùy chỉnh nội dung
              </a>
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default async function DigestPreviewPage(): Promise<React.ReactElement> {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (sess.role !== "admin") redirect("/");

  const today = new Date();
  const data = await gatherDigestData(today);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-background">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-5 text-amber-500" />
              Daily email digest preview
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm">
              Xem trước email tóm tắt hằng ngày sẽ trông như thế nào trong
              hộp thư. Trang này không gửi thật — chỉ hiển thị bản dựng dùng
              layout email-safe (table + inline styles, max 600px) để dán vào
              công cụ email marketing.
            </CardDescription>
          </div>
          <CopyHtmlButton targetId={PREVIEW_ID} />
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: source data summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="size-4 text-muted-foreground" />
              Dữ liệu nguồn
            </CardTitle>
            <CardDescription>
              Các con số đang được nạp vào template email bên phải.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              <SourceRow label="Tổng nhân viên" value={data.employeeCount} />
              <SourceRow
                label="Chấm công hôm nay (unique)"
                value={data.attendanceToday}
              />
              <SourceRow
                label="Chưa check-out"
                value={data.openAttendance}
              />
              <SourceRow
                label="Đơn nghỉ chờ duyệt"
                value={data.pendingLeaves}
              />
              <SourceRow
                label="Sinh nhật hôm nay"
                value={data.birthdaysToday}
              />
              <SourceRow
                label="Top streaks"
                value={data.topStreaks.length}
              />
              <li className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Briefing</span>
                <span className="text-right">
                  {data.standupSummary ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Có sẵn
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Chưa tạo</span>
                  )}
                </span>
              </li>
              <li className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">Tạo lúc</span>
                <span className="font-mono text-xs">
                  {data.generatedAt.toLocaleString("vi-VN")}
                </span>
              </li>
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Subject mẫu:{" "}
              <span className="font-mono text-foreground">
                Cafe HR · Tóm tắt {formatVnDate(today)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* RIGHT: email preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Inbox className="size-4 text-muted-foreground" />
              Bản dựng email
            </CardTitle>
            <CardDescription>
              Layout dùng &lt;table&gt; + inline styles để tương thích Gmail,
              Outlook, Apple Mail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/40 p-4">
              <EmailPreview data={data} today={today} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SourceRow({
  label,
  value,
}: {
  label: string;
  value: number;
}): React.ReactElement {
  return (
    <li className="flex items-center justify-between py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}
