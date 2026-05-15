// Static changelog content for the in-app /changelog page.
// Update this file each release — newest version first.
// Keep entries grounded in features that actually shipped (no inventing).

export type ChangelogKind = "feature" | "improvement" | "fix";

export type ChangelogItem = {
  kind: ChangelogKind;
  title: string;
  description: string;
  /** Optional lucide icon name — purely informational; the page renders kind-based icons. */
  icon?: string;
};

export type ChangelogEntry = {
  version: string;
  /** ISO date string — `YYYY-MM-DD`. */
  date: string;
  highlights: ChangelogItem[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "v1.6",
    date: "2026-05-15",
    highlights: [
      {
        kind: "feature",
        title: "Sửa nhanh ngay trong bảng nhân viên",
        description:
          "Inline edit cho tên, vị trí và lương cơ bản — không cần mở trang chi tiết.",
        icon: "Pencil",
      },
      {
        kind: "feature",
        title: "Lịch sử lương trong hồ sơ",
        description:
          "Widget thời gian tuyến tính cho thấy mọi lần điều chỉnh lương của nhân viên.",
        icon: "TrendingUp",
      },
      {
        kind: "feature",
        title: "Đổi ca hàng loạt",
        description:
          "Chọn nhiều ca, đổi người phụ trách trong một thao tác duy nhất.",
        icon: "Users",
      },
      {
        kind: "feature",
        title: "Tuỳ biến bảng điều khiển",
        description:
          "Bật/tắt và sắp xếp các thẻ thống kê trên trang Tổng quan theo ý bạn.",
        icon: "LayoutDashboard",
      },
      {
        kind: "improvement",
        title: "Phóng to ảnh đại diện",
        description:
          "Click avatar mở lightbox xem ảnh ở kích thước đầy đủ.",
        icon: "Image",
      },
      {
        kind: "feature",
        title: "Trang nhật ký cập nhật trong app",
        description:
          "Trang /changelog mới — xem lại toàn bộ lịch sử phiên bản ở một nơi.",
        icon: "BookOpen",
      },
    ],
  },
  {
    version: "v1.5",
    date: "2026-04-22",
    highlights: [
      {
        kind: "feature",
        title: "Nhập nhân viên từ Excel (.xlsx)",
        description:
          "Tải lên file XLSX, xem trước, đối chiếu rồi nhập hàng loạt vào hệ thống.",
        icon: "FileSpreadsheet",
      },
      {
        kind: "feature",
        title: "Sao lưu dữ liệu ra XLSX",
        description:
          "Xuất toàn bộ dữ liệu chính ra một workbook nhiều sheet để lưu trữ.",
        icon: "Download",
      },
      {
        kind: "feature",
        title: "Chấm công nhanh trên trang Của tôi",
        description:
          "Một nút check-in/check-out ngay trên /me, không cần điều hướng nữa.",
        icon: "Clock",
      },
      {
        kind: "feature",
        title: "Bảng xếp hạng nhân viên xuất sắc",
        description:
          "Top performers theo giờ làm và đánh giá hiệu suất hằng tháng.",
        icon: "Trophy",
      },
      {
        kind: "improvement",
        title: "Sparkline cho thẻ thống kê",
        description:
          "Mỗi thẻ thống kê có biểu đồ mini cho thấy xu hướng 7 ngày gần nhất.",
        icon: "Activity",
      },
      {
        kind: "feature",
        title: "Cài đặt hồ sơ cá nhân",
        description:
          "Trang cài đặt riêng cho từng người dùng — tên, mật khẩu, tuỳ chọn hiển thị.",
        icon: "UserCog",
      },
    ],
  },
  {
    version: "v1.4",
    date: "2026-03-18",
    highlights: [
      {
        kind: "feature",
        title: "PWA + service worker",
        description:
          "Cài Cafe HR như app trên điện thoại, hoạt động cả khi mạng chập chờn.",
        icon: "Smartphone",
      },
      {
        kind: "feature",
        title: "Tuỳ chọn thông báo",
        description:
          "Chọn loại sự kiện muốn nhận thông báo và kênh nhận (in-app / email).",
        icon: "Bell",
      },
      {
        kind: "feature",
        title: "Biểu đồ lưu lượng theo giờ",
        description:
          "Xem giờ cao điểm trong ngày để bố trí ca làm hợp lý hơn.",
        icon: "BarChart3",
      },
      {
        kind: "improvement",
        title: "Hiển thị ngày lễ trên lịch ca",
        description:
          "Lớp phủ ngày lễ trên lịch tuần để dễ tránh xếp ca trùng.",
        icon: "CalendarDays",
      },
      {
        kind: "improvement",
        title: "In lịch tuần chuyên nghiệp",
        description:
          "Bố cục in tối ưu cho lịch ca tuần — gọn gàng, đủ thông tin trên một trang A4.",
        icon: "Printer",
      },
      {
        kind: "feature",
        title: "Trang “My Day” cho nhân viên",
        description:
          "Trang /me dành riêng cho staff: ca hôm nay, công việc, nghỉ phép trong cùng một chỗ.",
        icon: "User",
      },
    ],
  },
  {
    version: "v1.3",
    date: "2026-02-20",
    highlights: [
      {
        kind: "feature",
        title: "Cảnh báo bất thường thông minh",
        description:
          "Anomaly insights tự động phát hiện chấm công lệch giờ, vắng đột ngột, nghỉ phép dày đặc.",
        icon: "AlertTriangle",
      },
      {
        kind: "improvement",
        title: "Nhật ký hệ thống có tìm kiếm",
        description:
          "Bộ lọc theo từ khoá, hành động, người thực hiện, khoảng thời gian trong /audit.",
        icon: "Search",
      },
      {
        kind: "improvement",
        title: "Dải “Ca hôm nay” cố định trên đầu",
        description:
          "Ribbon nhắc ca làm sắp tới ngay đầu trang chính cho mọi user.",
        icon: "Clock",
      },
      {
        kind: "improvement",
        title: "Chế độ hiển thị gọn",
        description:
          "Compact density toggle — nén bảng và card lại để xem nhiều dữ liệu hơn.",
        icon: "Rows",
      },
      {
        kind: "feature",
        title: "In phiếu lương",
        description:
          "Bố cục in dành riêng cho payslip, hỗ trợ in trực tiếp hoặc lưu PDF.",
        icon: "Printer",
      },
      {
        kind: "feature",
        title: "Checklist công việc hằng ngày",
        description:
          "Daily checklist cho từng ca — đảm bảo các đầu việc bắt buộc không bị bỏ sót.",
        icon: "ListChecks",
      },
      {
        kind: "feature",
        title: "Gửi lời khen (Kudos)",
        description:
          "Đồng nghiệp gửi kudos cho nhau, hiển thị trên hồ sơ và bảng tin.",
        icon: "Heart",
      },
    ],
  },
  {
    version: "v1.2",
    date: "2026-01-12",
    highlights: [
      {
        kind: "feature",
        title: "Toast thông báo realtime",
        description:
          "Sự kiện mới (chấm công, nghỉ phép, công việc) hiện ngay lập tức không cần refresh.",
        icon: "Bell",
      },
      {
        kind: "improvement",
        title: "Duyệt đơn nghỉ phép nhanh",
        description:
          "Phê duyệt/từ chối các đơn pending ngay từ widget trên Tổng quan.",
        icon: "Plane",
      },
      {
        kind: "feature",
        title: "Xuất CSV công việc & nghỉ phép",
        description:
          "Tải dữ liệu tasks và leaves ra CSV để tổng hợp ngoài hệ thống.",
        icon: "Download",
      },
      {
        kind: "feature",
        title: "Phiếu đánh giá hiệu suất",
        description:
          "Performance scorecard cho từng nhân viên dựa trên giờ làm, kudos và đánh giá.",
        icon: "Award",
      },
      {
        kind: "improvement",
        title: "Trau chuốt empty state",
        description:
          "Mọi danh sách rỗng đều có minh hoạ, gợi ý hành động — dễ nhìn hơn.",
        icon: "Sparkles",
      },
      {
        kind: "improvement",
        title: "Thanh tiến trình chuyển trang",
        description:
          "Page transition bar mảnh trên cùng để biết hệ thống đang tải.",
        icon: "Loader",
      },
    ],
  },
  {
    version: "v1.1",
    date: "2025-12-05",
    highlights: [
      {
        kind: "feature",
        title: "Bảng màu tuỳ chỉnh",
        description:
          "6 chủ đề: Cà phê, Xanh biển, Hồng đào, Lavender, Xanh lá, Đỏ rượu — đổi từ menu góc phải.",
        icon: "Palette",
      },
      {
        kind: "feature",
        title: "Phím tắt toàn cục",
        description:
          "Bấm ? ở bất kỳ trang nào để mở danh sách phím tắt đầy đủ.",
        icon: "Keyboard",
      },
      {
        kind: "improvement",
        title: "Sidebar thu gọn được",
        description:
          "Click nút ở chân sidebar để tiết kiệm không gian — lựa chọn được lưu lại.",
        icon: "PanelLeftClose",
      },
      {
        kind: "feature",
        title: "Banner sinh nhật + confetti",
        description:
          "Tự động chúc mừng nhân viên có sinh nhật hôm nay — kèm hiệu ứng confetti vui mắt.",
        icon: "Cake",
      },
      {
        kind: "improvement",
        title: "Số liệu chạy mượt mà",
        description:
          "Animated stat counters — các con số đếm từ 0 lên giá trị thật khi tải trang.",
        icon: "TrendingUp",
      },
      {
        kind: "feature",
        title: "Hộp thoại “Có gì mới?”",
        description:
          "Pop-up giới thiệu nhanh các tính năng mới mỗi khi cập nhật phiên bản.",
        icon: "Sparkles",
      },
      {
        kind: "improvement",
        title: "Đồng hồ thời gian làm việc",
        description:
          "Live elapsed time — đồng hồ đếm tăng theo thời gian thực cho ca đang mở.",
        icon: "Timer",
      },
    ],
  },
];
