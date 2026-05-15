export type ChecklistItem = { id: string; label: string };

export type ChecklistPreset = {
  key: "opening" | "closing" | "cleaning";
  title: string;
  description: string;
  iconName: "sunrise" | "moon" | "sparkles";
  tone: "amber" | "indigo" | "emerald";
  items: ChecklistItem[];
};

export const CHECKLIST_PRESETS: ChecklistPreset[] = [
  {
    key: "opening",
    title: "Mở quán",
    description: "Việc cần làm trước khi đón khách buổi sáng.",
    iconName: "sunrise",
    tone: "amber",
    items: [
      { id: "op-machine", label: "Bật máy pha cafe và để làm nóng" },
      { id: "op-beans", label: "Kiểm tra hạt cafe trong phễu xay" },
      { id: "op-milk", label: "Đổ sữa tươi vào tủ mát quầy bar" },
      { id: "op-bar", label: "Vệ sinh quầy bar và dụng cụ pha chế" },
      { id: "op-curtains", label: "Mở rèm và bật toàn bộ đèn khu khách" },
      { id: "op-pos", label: "Bật POS, kiểm tra kết nối mạng" },
      { id: "op-soap", label: "Kiểm tra nước rửa tay và xà phòng nhà vệ sinh" },
      { id: "op-paper", label: "Kiểm tra giấy in bill và máy in tem" },
    ],
  },
  {
    key: "closing",
    title: "Đóng quán",
    description: "Việc cần hoàn tất trước khi tan ca tối.",
    iconName: "moon",
    tone: "indigo",
    items: [
      { id: "cl-machine", label: "Tắt máy pha và xả áp lực hơi" },
      { id: "cl-grinder", label: "Vệ sinh máy xay cafe và phễu chứa" },
      { id: "cl-trash", label: "Đổ rác toàn bộ quầy và khu khách" },
      { id: "cl-cash", label: "Kiểm đếm doanh thu, đối chiếu POS" },
      { id: "cl-tables", label: "Lau bàn ghế, xếp gọn ghế lên bàn" },
      { id: "cl-lock", label: "Khoá cửa kho, cửa chính và cửa sau" },
      { id: "cl-power", label: "Tắt đèn, tắt điều hoà và quạt" },
      { id: "cl-summary", label: "Tổng kết shift và bàn giao chìa khoá" },
    ],
  },
  {
    key: "cleaning",
    title: "Vệ sinh giữa ca",
    description: "Vệ sinh nhanh giữa các khung giờ cao điểm.",
    iconName: "sparkles",
    tone: "emerald",
    items: [
      { id: "cn-bar", label: "Lau quầy bar và khu pha chế" },
      { id: "cn-sink", label: "Vệ sinh bồn rửa, dọn rác lưới chắn" },
      { id: "cn-tables", label: "Lau bàn khách đã rời và xếp ghế gọn" },
      { id: "cn-trash", label: "Kiểm tra thùng rác, thay túi nếu đầy" },
      { id: "cn-machine", label: "Vệ sinh nhanh vòi đánh sữa máy pha" },
    ],
  },
];
