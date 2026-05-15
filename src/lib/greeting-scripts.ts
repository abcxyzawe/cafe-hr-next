export type GreetingCategory =
  | "welcome"
  | "menu"
  | "upsell"
  | "complaint"
  | "farewell"
  | "ask";

export type GreetingScript = {
  id: string;
  category: GreetingCategory;
  title: string;
  text: string;
  iconName:
    | "users"
    | "coffee"
    | "sparkles"
    | "shield-check"
    | "smile"
    | "message-square-heart";
  notes?: string;
};

export const CATEGORY_LABEL: Record<GreetingCategory, string> = {
  welcome: "Chào đón",
  menu: "Giới thiệu menu",
  upsell: "Gợi ý thêm",
  complaint: "Xử lý phàn nàn",
  farewell: "Tạm biệt",
  ask: "Hỏi sở thích",
};

export const GREETING_SCRIPTS: GreetingScript[] = [
  {
    id: "welcome-walkin",
    category: "welcome",
    title: "Chào khách mới bước vào quán",
    text: "Chào quý khách, mời anh/chị ngồi! Hôm nay anh/chị muốn ngồi trong hay ngoài ạ?",
    iconName: "users",
    notes:
      "Mỉm cười, giao tiếp bằng mắt và chủ động hướng khách đến bàn còn trống trong vòng 10 giây đầu tiên.",
  },
  {
    id: "welcome-regular",
    category: "welcome",
    title: "Chào khách quen",
    text: "Chào anh/chị {name}, hôm nay vẫn ly latte truyền thống chứ ạ?",
    iconName: "smile",
    notes:
      "Cá nhân hoá bằng cách gọi tên và nhắc lại đồ uống quen thuộc giúp khách cảm thấy được nhớ và quan tâm.",
  },
  {
    id: "menu-introduction",
    category: "menu",
    title: "Giới thiệu menu & món mới",
    text: "Em xin gửi menu. Mới ra món bạc xỉu trân châu, anh chị có muốn thử không ạ?",
    iconName: "coffee",
    notes:
      "Luôn nhắc kèm 1 món mới hoặc món signature để tạo điểm chạm và tăng cơ hội bán món có biên lợi nhuận tốt.",
  },
  {
    id: "upsell-pastry",
    category: "upsell",
    title: "Gợi ý thêm bánh nóng",
    text: "Có cần em gọi thêm bánh croissant nóng ngay từ lò để dùng kèm không ạ?",
    iconName: "sparkles",
    notes:
      "Đề xuất món có sẵn nóng/tươi giúp khách dễ đồng ý và tăng giá trị đơn trung bình từ 15-25%.",
  },
  {
    id: "upsell-size",
    category: "upsell",
    title: "Gợi ý lên size",
    text: "Size lớn chỉ thêm 10k mà uống được lâu hơn, anh chị có muốn lên size không ạ?",
    iconName: "sparkles",
    notes:
      "Nói rõ con số chênh lệch giúp khách quyết định nhanh; tránh dùng câu chung chung như “lên size không ạ”.",
  },
  {
    id: "complaint-cold-drink",
    category: "complaint",
    title: "Đồ uống bị nguội",
    text: "Em rất xin lỗi vì để đồ uống nguội. Em xin pha lại ngay cho mình một ly mới và tặng kèm bánh quy nhé.",
    iconName: "shield-check",
    notes:
      "Nguyên tắc: xin lỗi trước, sửa sai ngay, tặng kèm món nhỏ để chuyển trải nghiệm tiêu cực thành điểm cộng.",
  },
  {
    id: "complaint-wait",
    category: "complaint",
    title: "Khách phàn nàn vì đợi lâu",
    text: "Em rất xin lỗi vì đợi lâu. Đồ uống của mình sẽ ra trong 2 phút nữa, em xin gửi quý khách miễn phí thêm bánh quy ạ.",
    iconName: "shield-check",
    notes:
      "Cho khách một mốc thời gian cụ thể (≤ 3 phút) thay vì hứa chung chung; báo lại bếp để ưu tiên đơn này.",
  },
  {
    id: "ask-preference",
    category: "ask",
    title: "Hỏi gu cà phê",
    text: "Anh/chị thích cà phê đậm hay nhẹ ạ? Em có thể gợi ý món phù hợp.",
    iconName: "message-square-heart",
    notes:
      "Câu hỏi mở giúp tư vấn đúng món; ghi nhớ câu trả lời để áp dụng cho lần ghé sau của khách.",
  },
  {
    id: "ask-allergies",
    category: "ask",
    title: "Hỏi dị ứng & lưu ý",
    text: "Trong nhóm mình có ai dị ứng sữa hoặc đường không, để em note rõ với bếp ạ?",
    iconName: "message-square-heart",
    notes:
      "Bắt buộc hỏi với nhóm khách mới hoặc đơn nhiều món; ghi rõ vào ghi chú đơn để bếp xử lý chính xác.",
  },
  {
    id: "farewell",
    category: "farewell",
    title: "Tạm biệt khi khách rời quán",
    text: "Cảm ơn quý khách đã ghé. Hẹn gặp lại lần sau, chúc anh/chị một ngày tốt lành!",
    iconName: "smile",
    notes:
      "Đứng dậy hoặc dừng việc đang làm trong 2 giây, nhìn về phía khách và gửi lời chào — đây là điểm chạm cuối quyết định ấn tượng chung.",
  },
];
