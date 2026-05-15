export type SitemapIconName =
  | "home"
  | "user"
  | "users"
  | "calendar-clock"
  | "calendar-days"
  | "clipboard-check"
  | "list-checks"
  | "plane"
  | "wallet"
  | "bar-chart-3"
  | "scroll-text"
  | "sparkles"
  | "cog"
  | "palette"
  | "bell"
  | "message-square-heart"
  | "user-cog"
  | "monitor"
  | "qr-code"
  | "search"
  | "megaphone"
  | "cake"
  | "package"
  | "scroll"
  | "coffee"
  | "scale"
  | "help-circle"
  | "quote"
  | "utensils-crossed"
  | "gift"
  | "users-round"
  | "presentation"
  | "trending-up"
  | "briefcase"
  | "chef-hat"
  | "book-open"
  | "smile"
  | "dollar-sign"
  | "receipt"
  | "coins"
  | "share-2"
  | "timer"
  | "target"
  | "trophy"
  | "music"
  | "info"
  | "image"
  | "mail"
  | "wrench"
  | "lightbulb"
  | "mic"
  | "globe"
  | "tag"
  | "heart"
  | "graduation-cap"
  | "brain"
  | "mail-check"
  | "thermometer"
  | "calendar-heart"
  | "leaf"
  | "code-2"
  | "camera"
  | "building-2"
  | "clipboard-list"
  | "shirt"
  | "star"
  | "focus"
  | "snowflake"
  | "gauge"
  | "flame"
  | "alert-triangle";

export type SitemapCategory =
  | "main"
  | "ops"
  | "people"
  | "analytics"
  | "system"
  | "ai"
  | "ai-images"
  | "learning"
  | "finance"
  | "tools"
  | "admin"
  | "schedule"
  | "team"
  | "personal";

export type SitemapEntry = {
  href: string;
  label: string;
  description: string;
  iconName: SitemapIconName;
  category: SitemapCategory;
  adminOnly?: boolean;
};

export const SITEMAP_CATEGORY_META: Record<
  SitemapCategory,
  { label: string; description: string }
> = {
  main: {
    label: "Chính",
    description: "Tổng quan và không gian cá nhân của bạn.",
  },
  ops: {
    label: "Vận hành",
    description: "Ca làm, chấm công, công việc và kho hàng ngày.",
  },
  people: {
    label: "Nhân sự",
    description: "Hồ sơ nhân viên, lương và sự kiện liên quan đến đội ngũ.",
  },
  analytics: {
    label: "Phân tích",
    description: "Báo cáo, nhật ký kiểm toán và tìm kiếm dữ liệu.",
  },
  ai: {
    label: "Công cụ AI",
    description: "Trợ lý AI cho tuyển dụng, marketing, thực đơn và đào tạo.",
  },
  "ai-images": {
    label: "Hình ảnh AI",
    description: "Sinh hình ảnh và concept trực quan bằng AI.",
  },
  admin: {
    label: "Quản trị",
    description: "Bảng điều khiển và trung tâm phân tích dành cho quản trị viên.",
  },
  schedule: {
    label: "Lịch & Ca",
    description: "Lịch nghỉ phép, phân ca và các bảng theo dõi liên quan.",
  },
  team: {
    label: "Đội ngũ",
    description: "Bảng xếp hạng, kỷ niệm gắn bó và sức khoẻ đội ngũ.",
  },
  personal: {
    label: "Cá nhân",
    description: "Chuỗi làm việc, tóm tắt tuần và các bảng cá nhân hoá.",
  },
  learning: {
    label: "Học tập",
    description: "Công thức, quy trình chuẩn (SOP) và tài liệu nội bộ.",
  },
  finance: {
    label: "Tài chính",
    description: "Doanh thu, chi phí, lương và phân chia tiền tip.",
  },
  tools: {
    label: "Tiện ích",
    description: "Công cụ phụ trợ và trải nghiệm cho đội ngũ.",
  },
  system: {
    label: "Hệ thống",
    description: "Tuỳ chỉnh tài khoản, giao diện và trợ giúp.",
  },
};

export const SITEMAP_ENTRIES: ReadonlyArray<SitemapEntry> = [
  // ---------- Chính ----------
  {
    href: "/",
    label: "Bảng điều khiển",
    description: "Tổng quan các chỉ số và hoạt động gần đây.",
    iconName: "home",
    category: "main",
  },
  {
    href: "/me",
    label: "Của tôi",
    description: "Hồ sơ, ca, công việc và bảng lương cá nhân.",
    iconName: "user",
    category: "main",
  },

  // ---------- Vận hành ----------
  {
    href: "/shifts",
    label: "Ca làm việc",
    description: "Lập lịch ca theo tuần và phân công nhân viên.",
    iconName: "calendar-clock",
    category: "ops",
  },
  {
    href: "/shifts/month",
    label: "Lịch ca tháng",
    description: "Tổng quan lịch ca theo tháng cho toàn quán.",
    iconName: "calendar-days",
    category: "ops",
  },
  {
    href: "/attendance",
    label: "Chấm công",
    description: "Quản lý điểm danh, vào/ra ca của nhân viên.",
    iconName: "clipboard-check",
    category: "ops",
  },
  {
    href: "/tasks",
    label: "Công việc",
    description: "Giao và theo dõi tiến độ các đầu việc trong quán.",
    iconName: "list-checks",
    category: "ops",
  },
  {
    href: "/leave",
    label: "Nghỉ phép",
    description: "Đề xuất, duyệt và xem lịch nghỉ của nhân viên.",
    iconName: "plane",
    category: "ops",
  },
  {
    href: "/people-calendar",
    label: "Lịch nhân sự",
    description: "Lịch tổng hợp ca làm, nghỉ phép và sự kiện đội ngũ.",
    iconName: "calendar-days",
    category: "ops",
    adminOnly: true,
  },
  {
    href: "/checklist",
    label: "Checklist",
    description: "Danh sách kiểm tra mở/đóng quán hằng ngày.",
    iconName: "clipboard-check",
    category: "ops",
  },
  {
    href: "/inventory",
    label: "Kho hàng",
    description: "Theo dõi nguyên liệu, tồn kho và nhập xuất.",
    iconName: "package",
    category: "ops",
  },
  {
    href: "/equipment",
    label: "Thiết bị",
    description: "Quản lý máy móc, dụng cụ và lịch bảo trì.",
    iconName: "wrench",
    category: "ops",
  },
  {
    href: "/skills",
    label: "Kỹ năng",
    description: "Theo dõi kỹ năng và chứng chỉ của đội ngũ.",
    iconName: "graduation-cap",
    category: "ops",
    adminOnly: true,
  },
  {
    href: "/reservations",
    label: "Đặt bàn",
    description: "Quản lý đặt bàn và khách hẹn tới quán.",
    iconName: "utensils-crossed",
    category: "ops",
  },
  {
    href: "/waiting-list",
    label: "Danh sách chờ",
    description: "Theo dõi khách đang xếp hàng và thời gian chờ tại quán.",
    iconName: "users-round",
    category: "ops",
  },
  {
    href: "/holidays",
    label: "Ngày lễ",
    description: "Lịch ngày lễ Việt Nam dùng để tính ca và tính lương.",
    iconName: "calendar-days",
    category: "ops",
  },
  {
    href: "/shift-template",
    label: "Mẫu ca làm",
    description: "Tạo và quản lý các mẫu ca tái sử dụng cho lịch tuần.",
    iconName: "calendar-clock",
    category: "ops",
    adminOnly: true,
  },
  {
    href: "/suppliers",
    label: "Nhà cung cấp",
    description: "Danh bạ nhà cung cấp nguyên liệu và vật tư của quán.",
    iconName: "package",
    category: "ops",
    adminOnly: true,
  },

  // ---------- Nhân sự ----------
  {
    href: "/employees",
    label: "Nhân viên",
    description: "Danh sách và hồ sơ chi tiết của nhân viên.",
    iconName: "users",
    category: "people",
  },
  {
    href: "/employees/compare",
    label: "So sánh nhân viên",
    description: "So sánh hồ sơ, hiệu suất giữa các nhân viên.",
    iconName: "scale",
    category: "people",
  },
  {
    href: "/payroll",
    label: "Bảng lương",
    description: "Tính lương theo kỳ và tạo phiếu lương cá nhân.",
    iconName: "wallet",
    category: "people",
  },
  {
    href: "/quotes",
    label: "Trích dẫn",
    description: "Bộ sưu tập câu nói truyền cảm hứng cho team.",
    iconName: "quote",
    category: "people",
    adminOnly: true,
  },
  {
    href: "/birthdays",
    label: "Sinh nhật",
    description: "Lịch sinh nhật và lời chúc dành cho nhân viên.",
    iconName: "cake",
    category: "people",
  },
  {
    href: "/loyalty",
    label: "Thâm niên",
    description: "Theo dõi mốc gắn bó và phần thưởng cho nhân viên.",
    iconName: "gift",
    category: "people",
  },
  {
    href: "/demographics",
    label: "Nhân khẩu học",
    description: "Phân bố độ tuổi, giới tính và vị trí của đội ngũ.",
    iconName: "users-round",
    category: "people",
  },
  {
    href: "/kiosk-qr",
    label: "Mã QR Kiosk",
    description: "In mã QR check-in nhanh cho kiosk tại quán.",
    iconName: "qr-code",
    category: "people",
  },
  {
    href: "/vision",
    label: "Tầm nhìn đội ngũ",
    description: "Bảng tầm nhìn chung và mục tiêu dài hạn của đội.",
    iconName: "image",
    category: "people",
    adminOnly: true,
  },
  {
    href: "/events",
    label: "Sự kiện",
    description: "Sự kiện nội bộ, hội thao và hoạt động gắn kết.",
    iconName: "calendar-heart",
    category: "people",
  },
  {
    href: "/testimonials",
    label: "Lời chứng thực",
    description: "Cảm nhận và lời khen của khách dành cho quán.",
    iconName: "smile",
    category: "people",
  },
  {
    href: "/self-assessment",
    label: "Tự đánh giá",
    description: "Phiếu tự đánh giá năng lực và phát triển cá nhân.",
    iconName: "smile",
    category: "people",
  },
  {
    href: "/employee-of-the-day",
    label: "Nhân viên của ngày",
    description: "Vinh danh nhân viên xuất sắc trong ngày của quán.",
    iconName: "trophy",
    category: "people",
    adminOnly: true,
  },

  // ---------- Phân tích ----------
  {
    href: "/reports",
    label: "Báo cáo",
    description: "Báo cáo tổng hợp về ca, chấm công và hiệu suất.",
    iconName: "bar-chart-3",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/audit",
    label: "Nhật ký kiểm toán",
    description: "Theo dõi mọi thay đổi quan trọng trong hệ thống.",
    iconName: "scroll-text",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/changelog",
    label: "Lịch sử cập nhật",
    description: "Các thay đổi và tính năng mới của ứng dụng.",
    iconName: "scroll",
    category: "analytics",
  },
  {
    href: "/notes-search",
    label: "Tìm kiếm ghi chú",
    description: "Tìm nhanh ghi chú trong toàn bộ hệ thống.",
    iconName: "search",
    category: "analytics",
  },
  {
    href: "/leave-balance",
    label: "Số dư phép",
    description: "Theo dõi quỹ phép còn lại của từng nhân viên.",
    iconName: "plane",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/announcements",
    label: "Thông báo",
    description: "Đăng và quản lý thông báo nội bộ cho cả quán.",
    iconName: "megaphone",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/standup",
    label: "Họp đầu ca",
    description: "Tóm tắt nhanh tình hình quán cho cuộc họp đầu ca.",
    iconName: "presentation",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/weekly-insights",
    label: "Phân tích tuần",
    description: "Báo cáo phân tích các chỉ số chính theo tuần.",
    iconName: "bar-chart-3",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/trends",
    label: "Xu hướng",
    description: "Biểu đồ xu hướng dài hạn của quán.",
    iconName: "trending-up",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/forecast",
    label: "Dự báo",
    description: "Dự báo doanh thu và lưu lượng khách trong tương lai.",
    iconName: "trending-up",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/busy-hours",
    label: "Khung giờ cao điểm",
    description: "Bản đồ nhiệt khung giờ đông khách trong tuần.",
    iconName: "thermometer",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/competitive-intel",
    label: "Phân tích đối thủ",
    description: "Theo dõi và so sánh đối thủ cạnh tranh trong khu vực.",
    iconName: "search",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/kpi-framework",
    label: "Khung KPI",
    description: "Thiết lập khung chỉ số KPI và mục tiêu cho từng vai trò.",
    iconName: "target",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/reviews",
    label: "Đánh giá khách hàng",
    description: "Tổng hợp và quản lý đánh giá, nhận xét của khách dành cho quán.",
    iconName: "star",
    category: "analytics",
  },
  {
    href: "/survey-builder",
    label: "Trình tạo khảo sát",
    description: "Thiết kế khảo sát khách hàng và thu thập phản hồi có cấu trúc.",
    iconName: "clipboard-list",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/feedback-compiler",
    label: "Tổng hợp góp ý",
    description: "Tự động gom góp ý từ khách và nhân viên thành báo cáo có cấu trúc.",
    iconName: "message-square-heart",
    category: "analytics",
    adminOnly: true,
  },

  // ---------- Công cụ AI ----------
  {
    href: "/hiring",
    label: "Tuyển dụng",
    description: "Trợ lý AI viết tin tuyển dụng và sàng lọc ứng viên.",
    iconName: "briefcase",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/marketing",
    label: "Marketing",
    description: "Sinh nội dung marketing, caption và bài đăng mạng xã hội.",
    iconName: "megaphone",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/menu-ideas",
    label: "Ý tưởng menu",
    description: "Gợi ý món mới và biến tấu thực đơn theo mùa.",
    iconName: "lightbulb",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/menu-week",
    label: "Menu tuần",
    description: "Lên thực đơn theo tuần với gợi ý của AI.",
    iconName: "utensils-crossed",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/menu-translator",
    label: "Dịch menu",
    description: "Dịch thực đơn sang nhiều ngôn ngữ tự nhiên.",
    iconName: "globe",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/name-generator",
    label: "Đặt tên món",
    description: "Gợi ý tên gọi sáng tạo cho món và đồ uống.",
    iconName: "tag",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/image-playground",
    label: "Sân chơi ảnh",
    description: "Sinh ảnh AI dùng cho menu, marketing và truyền thông.",
    iconName: "image",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/feedback-sentiment",
    label: "Cảm xúc góp ý",
    description: "Phân tích cảm xúc từ góp ý của khách và nhân viên.",
    iconName: "heart",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/email-reply",
    label: "Soạn email",
    description: "Trợ lý AI soạn email trả lời khách và đối tác.",
    iconName: "mail",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/training",
    label: "Đào tạo",
    description: "Soạn nội dung đào tạo nhân viên với gợi ý AI.",
    iconName: "brain",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/quiz",
    label: "Đố vui",
    description: "Câu hỏi nhanh giúp ôn tập kiến thức cho team.",
    iconName: "help-circle",
    category: "ai",
  },
  {
    href: "/seo-meta",
    label: "SEO & Meta",
    description: "Sinh thẻ meta, mô tả SEO cho trang web của quán.",
    iconName: "globe",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/persona",
    label: "Chân dung khách",
    description: "Xây dựng chân dung khách hàng mục tiêu bằng AI.",
    iconName: "users-round",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/vision-statement",
    label: "Tuyên ngôn tầm nhìn",
    description: "Soạn tuyên ngôn tầm nhìn và sứ mệnh cho quán.",
    iconName: "lightbulb",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/finance-health",
    label: "Sức khoẻ tài chính",
    description: "AI đánh giá sức khoẻ tài chính và đề xuất cải thiện.",
    iconName: "scale",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/task-suggest",
    label: "Gợi ý công việc",
    description: "AI gợi ý đầu việc phù hợp cho từng nhân viên.",
    iconName: "sparkles",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/playlist-dj",
    label: "DJ playlist AI",
    description: "AI gợi ý nhạc nền theo khung giờ và không khí quán.",
    iconName: "music",
    category: "ai",
  },
  {
    href: "/social-content",
    label: "Nội dung mạng xã hội",
    description: "AI sinh bài đăng và caption cho các kênh mạng xã hội.",
    iconName: "share-2",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/poster-generator",
    label: "Tạo poster",
    description: "AI tạo poster quảng bá cho chương trình và sự kiện.",
    iconName: "image",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/logo-concepts",
    label: "Ý tưởng logo",
    description: "AI gợi ý các ý tưởng logo và nhận diện thương hiệu.",
    iconName: "palette",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/interior-design",
    label: "Thiết kế nội thất",
    description: "AI gợi ý phương án thiết kế và bài trí không gian quán.",
    iconName: "image",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/pricing-strategy",
    label: "Chiến lược giá",
    description: "AI đề xuất chiến lược giá và điều chỉnh thực đơn.",
    iconName: "tag",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/ig-post",
    label: "Bài đăng Instagram",
    description: "AI dựng caption và bố cục bài đăng Instagram cho quán.",
    iconName: "camera",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/mood-board",
    label: "Bảng cảm hứng",
    description: "AI tạo mood board hình ảnh và tông màu cho dự án thương hiệu.",
    iconName: "palette",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/storefront-mockup",
    label: "Mockup mặt tiền",
    description: "AI dựng phối cảnh mặt tiền và biển hiệu cho quán.",
    iconName: "building-2",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/thank-you",
    label: "Lời cảm ơn",
    description: "AI soạn lời cảm ơn dành cho khách hàng và đối tác của quán.",
    iconName: "heart",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/uniform-design",
    label: "Thiết kế đồng phục",
    description: "AI gợi ý phương án đồng phục và phối màu cho nhân viên.",
    iconName: "shirt",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/menu-illustrate",
    label: "Minh họa món AI",
    description: "AI vẽ minh họa vuông cho từng món dùng trong menu và mạng xã hội.",
    iconName: "palette",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/pairings",
    label: "Gợi ý món kèm",
    description: "AI gợi ý món ăn và snack đi kèm phù hợp với từng đồ uống.",
    iconName: "coffee",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/seasonal-decor",
    label: "Trang trí theo mùa",
    description: "AI phác concept trang trí cổng vào, tường, bàn và cửa sổ theo mùa.",
    iconName: "snowflake",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/greeting-card",
    label: "Thiệp chúc mừng AI",
    description: "AI vẽ nền thiệp và viết lời chúc tiếng Việt cho từng dịp đặc biệt.",
    iconName: "gift",
    category: "ai",
    adminOnly: true,
  },

  // ---------- Học tập ----------
  {
    href: "/recipes",
    label: "Công thức",
    description: "Thư viện công thức pha chế và chế biến của quán.",
    iconName: "chef-hat",
    category: "learning",
  },
  {
    href: "/sop",
    label: "Quy trình SOP",
    description: "Quy trình chuẩn vận hành cho từng vị trí.",
    iconName: "book-open",
    category: "learning",
  },
  {
    href: "/greetings",
    label: "Lời chào",
    description: "Mẫu lời chào và kịch bản tiếp khách thân thiện.",
    iconName: "smile",
    category: "learning",
  },
  {
    href: "/menu",
    label: "Thực đơn",
    description: "Danh sách món, đồ uống và giá bán hiện hành của quán.",
    iconName: "utensils-crossed",
    category: "learning",
  },

  // ---------- Tài chính ----------
  {
    href: "/revenue",
    label: "Doanh thu",
    description: "Theo dõi doanh thu theo ngày, tuần và tháng.",
    iconName: "dollar-sign",
    category: "finance",
    adminOnly: true,
  },
  {
    href: "/expenses",
    label: "Chi phí",
    description: "Quản lý các khoản chi phí vận hành của quán.",
    iconName: "receipt",
    category: "finance",
    adminOnly: true,
  },
  {
    href: "/tip-tools",
    label: "Công cụ tiền tip",
    description: "Bộ công cụ tính toán và phân loại tiền tip.",
    iconName: "coins",
    category: "finance",
  },
  {
    href: "/tip-split",
    label: "Chia tiền tip",
    description: "Chia tiền tip theo ca và đóng góp của nhân viên.",
    iconName: "coins",
    category: "finance",
    adminOnly: true,
  },
  {
    href: "/budget-allocator",
    label: "Phân bổ ngân sách",
    description: "Lập kế hoạch và phân bổ ngân sách theo từng hạng mục.",
    iconName: "wallet",
    category: "finance",
    adminOnly: true,
  },
  {
    href: "/roi-calculator",
    label: "Tính ROI",
    description: "Công cụ tính tỉ suất hoàn vốn cho khoản đầu tư của quán.",
    iconName: "scale",
    category: "finance",
    adminOnly: true,
  },

  // ---------- Tiện ích ----------
  {
    href: "/qr-share",
    label: "Chia sẻ QR",
    description: "Tạo nhanh mã QR để chia sẻ liên kết hoặc thông tin.",
    iconName: "qr-code",
    category: "tools",
  },
  {
    href: "/break-timer",
    label: "Hẹn giờ giải lao",
    description: "Đếm ngược thời gian nghỉ giữa ca cho nhân viên.",
    iconName: "timer",
    category: "tools",
  },
  {
    href: "/focus-mode",
    label: "Chế độ tập trung",
    description: "Bảng tập trung gọn cho ca hôm nay với việc cần làm và nhịp ca của bạn.",
    iconName: "focus",
    category: "tools",
  },
  {
    href: "/goals",
    label: "Mục tiêu",
    description: "Đặt và theo dõi mục tiêu của quán và cá nhân.",
    iconName: "target",
    category: "tools",
  },
  {
    href: "/wins",
    label: "Thành tích",
    description: "Ghi nhận khoảnh khắc đáng tự hào của đội ngũ.",
    iconName: "trophy",
    category: "tools",
  },
  {
    href: "/playlist",
    label: "Danh sách nhạc",
    description: "Danh sách phát nhạc nền cho không gian quán.",
    iconName: "music",
    category: "tools",
  },
  {
    href: "/about",
    label: "Giới thiệu",
    description: "Giới thiệu về ứng dụng và đội ngũ phát triển.",
    iconName: "info",
    category: "tools",
  },
  {
    href: "/brand",
    label: "Thương hiệu",
    description: "Bộ nhận diện thương hiệu, logo và bảng màu.",
    iconName: "palette",
    category: "tools",
    adminOnly: true,
  },
  {
    href: "/gallery",
    label: "Thư viện ảnh",
    description: "Thư viện ảnh sản phẩm và không gian quán.",
    iconName: "image",
    category: "tools",
    adminOnly: true,
  },
  {
    href: "/digest-preview",
    label: "Xem trước bản tin",
    description: "Xem trước bản tin tổng hợp gửi tới đội ngũ.",
    iconName: "mail-check",
    category: "tools",
    adminOnly: true,
  },
  {
    href: "/email-signature",
    label: "Chữ ký email",
    description: "Tạo chữ ký email chuyên nghiệp cho nhân viên.",
    iconName: "mail",
    category: "tools",
  },
  {
    href: "/newsletter",
    label: "Bản tin tuần AI",
    description: "Tạo bản tin nội bộ tự động bằng AI.",
    iconName: "mail-check",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/sustainability",
    label: "Bền vững",
    description: "Theo dõi các chỉ số bền vững và sáng kiến xanh của quán.",
    iconName: "leaf",
    category: "tools",
  },

  // ---------- Hệ thống ----------
  {
    href: "/settings",
    label: "Cài đặt",
    description: "Trung tâm tuỳ chỉnh chung của ứng dụng.",
    iconName: "cog",
    category: "system",
    adminOnly: true,
  },
  {
    href: "/settings/profile",
    label: "Hồ sơ tài khoản",
    description: "Cập nhật thông tin cá nhân và mật khẩu đăng nhập.",
    iconName: "user-cog",
    category: "system",
    adminOnly: true,
  },
  {
    href: "/settings/appearance",
    label: "Giao diện",
    description: "Chủ đề màu, mật độ và bảng màu hiển thị.",
    iconName: "palette",
    category: "system",
    adminOnly: true,
  },
  {
    href: "/settings/notifications",
    label: "Thông báo cá nhân",
    description: "Tuỳ chỉnh nhận thông báo trên trình duyệt và email.",
    iconName: "bell",
    category: "system",
    adminOnly: true,
  },
  {
    href: "/settings/feedback",
    label: "Góp ý",
    description: "Gửi góp ý, báo lỗi và đề xuất tính năng mới.",
    iconName: "message-square-heart",
    category: "system",
    adminOnly: true,
  },
  {
    href: "/help",
    label: "Trợ giúp",
    description: "Hướng dẫn sử dụng và phím tắt nhanh.",
    iconName: "help-circle",
    category: "system",
  },
  {
    href: "/backup-now",
    label: "Sao lưu ngay",
    description: "Xuất bản sao lưu cấu hình và dữ liệu cục bộ tức thì.",
    iconName: "monitor",
    category: "system",
    adminOnly: true,
  },
  {
    href: "/api-docs",
    label: "Tài liệu API",
    description: "Tham chiếu các endpoint API nội bộ của ứng dụng.",
    iconName: "code-2",
    category: "system",
  },

  // ---------- Quản trị ----------
  {
    href: "/admin/dashboard-v2",
    label: "Bảng điều khiển v2",
    description: "Tổng quan toàn diện với KPIStat và snapshot.",
    iconName: "gauge",
    category: "admin",
    adminOnly: true,
  },
  {
    href: "/admin/insights",
    label: "Trung tâm phân tích",
    description: "4 endpoint pulse/burnout/snapshot/anniversaries gộp một chỗ.",
    iconName: "bar-chart-3",
    category: "admin",
    adminOnly: true,
  },

  // ---------- Phân tích (boards mới) ----------
  {
    href: "/burnout-board",
    label: "Cảnh báo kiệt sức",
    description: "Đánh giá rủi ro burnout 30 ngày.",
    iconName: "flame",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/team-pulse-board",
    label: "Sức khỏe đội ngũ",
    description: "Pulse score theo vai trò.",
    iconName: "heart",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/tasks-forecast-board",
    label: "Dự báo task",
    description: "ETA dựa trên vận tốc lịch sử.",
    iconName: "trending-up",
    category: "analytics",
    adminOnly: true,
  },
  {
    href: "/peak-hours-board",
    label: "Giờ cao điểm",
    description: "Heat strip 24h cùng ngày trong tuần.",
    iconName: "thermometer",
    category: "analytics",
    adminOnly: true,
  },

  // ---------- Lịch & Ca ----------
  {
    href: "/leaves-calendar-board",
    label: "Lịch nghỉ phép",
    description: "Calendar 6 tuần với cờ ngày lễ.",
    iconName: "calendar-days",
    category: "schedule",
    adminOnly: true,
  },
  {
    href: "/coverage-gaps-board",
    label: "Lỗ hổng phân ca",
    description: "Phát hiện ngày thiếu nhân lực trên lịch ca.",
    iconName: "alert-triangle",
    category: "schedule",
    adminOnly: true,
  },

  // ---------- Đội ngũ ----------
  {
    href: "/anniversaries-board",
    label: "Bảng kỷ niệm gắn bó",
    description: "Theo dõi mốc kỷ niệm gắn bó của nhân viên.",
    iconName: "gift",
    category: "team",
    adminOnly: true,
  },
  {
    href: "/leaderboard",
    label: "Bảng xếp hạng",
    description: "Top 10 trên 6 hạng mục theo tuần.",
    iconName: "trophy",
    category: "team",
    adminOnly: true,
  },

  // ---------- Cá nhân ----------
  {
    href: "/me/streak",
    label: "Chuỗi làm việc",
    description: "Streak cá nhân kèm huy hiệu thành tựu.",
    iconName: "flame",
    category: "personal",
  },
  {
    href: "/me/recap-board",
    label: "Tóm tắt 7 ngày",
    description: "Tóm tắt tuần cá nhân của bạn.",
    iconName: "scroll-text",
    category: "personal",
  },

  // ---------- Công cụ AI bổ sung ----------
  {
    href: "/review-responder",
    label: "Trả lời đánh giá AI",
    description: "Grok tạo 3 phản hồi cho review khách.",
    iconName: "message-square-heart",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/meeting-agenda",
    label: "Agenda họp AI",
    description: "Tạo agenda họp tự động bằng AI.",
    iconName: "presentation",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/shift-optimizer",
    label: "Tối ưu ca AI",
    description: "AI gợi ý xếp lịch tuần hợp lý.",
    iconName: "sparkles",
    category: "ai",
    adminOnly: true,
  },
  {
    href: "/value-prop",
    label: "Canvas giá trị AI",
    description: "Mô hình value proposition canvas bằng AI.",
    iconName: "target",
    category: "ai",
    adminOnly: true,
  },

  // ---------- Hình ảnh AI ----------
  {
    href: "/plate-styling",
    label: "Trang trí đĩa AI",
    description: "Sinh concept trình bày món ăn bằng AI.",
    iconName: "chef-hat",
    category: "ai-images",
    adminOnly: true,
  },
];
