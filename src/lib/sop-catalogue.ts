export type SopStep = { text: string; warning?: boolean };

export type Sop = {
  id: string;
  title: string;
  category: "service" | "cleaning" | "safety" | "cash";
  estimatedMinutes: number;
  iconName:
    | "users"
    | "sparkles"
    | "shield-check"
    | "scale"
    | "coffee"
    | "flame"
    | "package";
  description: string;
  steps: SopStep[];
  tips?: string[];
};

export const SOP_CATEGORY_LABEL: Record<Sop["category"], string> = {
  service: "Phục vụ",
  cleaning: "Vệ sinh",
  safety: "An toàn",
  cash: "Tiền mặt",
};

export const SOPS: Sop[] = [
  {
    id: "welcome-customer",
    title: "Đón tiếp khách hàng tại quầy",
    category: "service",
    estimatedMinutes: 3,
    iconName: "users",
    description:
      "Quy trình chào đón và ghi đơn cho khách mới bước vào quán.",
    steps: [
      {
        text:
          "Chào khách trong vòng 5 giây kể từ khi khách bước vào, mắt nhìn khách và mỉm cười: \"Chào anh/chị, mời vào ạ!\".",
      },
      {
        text:
          "Hỏi số lượng khách, mời khách chọn bàn phù hợp (gần cửa sổ, trong góc, ngoài hiên...).",
      },
      {
        text:
          "Đưa menu cho khách (menu mặt cầm về phía khách), thông báo món Đặc biệt trong ngày nếu có.",
      },
      {
        text:
          "Lùi lại 1 bước, để khách đọc menu khoảng 1-2 phút trước khi quay lại ghi đơn.",
      },
      {
        text:
          "Ghi đơn rõ ràng: tên món, size, ngọt %, đá %, ghi chú dị ứng/yêu cầu riêng. Đọc lại đơn cho khách xác nhận.",
      },
      {
        text:
          "Cảm ơn khách, thông báo thời gian chờ ước tính, và chuyển đơn vào bar/bếp ngay lập tức.",
      },
    ],
    tips: [
      "Ghi nhớ tên khách quen — gọi tên khi chào sẽ tạo ấn tượng rất tốt.",
      "Nếu quán đang đông, vẫn chào trước rồi nói: \"Anh/chị chờ em 1 phút nhé!\".",
      "Khách có trẻ nhỏ: đề nghị ghế cao và bộ tô/muỗng cho bé.",
    ],
  },
  {
    id: "espresso-pull",
    title: "Pha một shot espresso đúng chuẩn",
    category: "service",
    estimatedMinutes: 2,
    iconName: "coffee",
    description:
      "Quy trình chiết xuất espresso 18g → 36g trong 25-30 giây.",
    steps: [
      {
        text:
          "Vệ sinh tay cầm portafilter bằng khăn khô, đảm bảo basket sạch khô không bám bã cũ.",
      },
      {
        text:
          "Cân 18g cà phê (±0.2g) vào basket double shot. Phân bố đều bằng WDT hoặc gõ nhẹ.",
      },
      {
        text:
          "Tamp với lực khoảng 15kg, giữ tamper vuông góc — nếu nén lệch sẽ gây channeling.",
        warning: true,
      },
      {
        text:
          "Xả nước máy 2-3 giây để ổn định nhiệt và làm sạch group head trước khi gắn portafilter.",
      },
      {
        text:
          "Gắn portafilter, bấm shot ngay. Đặt cốc espresso (50ml) hứng bên dưới đúng vị trí 2 vòi.",
      },
      {
        text:
          "Quan sát dòng chảy: nâu vàng đều, độ chảy mật ong. Dừng khi đạt 36g (±2g) trong 25-30s.",
        warning: true,
      },
      {
        text:
          "Nếu shot dưới 22s (sour) hoặc trên 35s (đắng) — bỏ shot, chỉnh lại độ mịn rồi pha lại.",
        warning: true,
      },
    ],
    tips: [
      "Luôn knock bã ngay sau khi pha — bã nguội sẽ bám chặt rất khó vệ sinh.",
      "Kiểm tra tỉ lệ 1:2 (in:out) là tỉ lệ tham chiếu chuẩn cho espresso truyền thống.",
    ],
  },
  {
    id: "end-of-day-clean",
    title: "Đóng quầy & vệ sinh cuối ngày",
    category: "cleaning",
    estimatedMinutes: 45,
    iconName: "sparkles",
    description:
      "Checklist vệ sinh máy móc, khu pha chế và sàn nhà trước khi tan ca tối.",
    steps: [
      {
        text:
          "Ngừng nhận đơn 15 phút trước giờ đóng cửa, thông báo khách còn lại.",
      },
      {
        text:
          "Backflush máy espresso bằng viên Cafiza: 5 chu kỳ 10s on / 10s off cho mỗi group head.",
        warning: true,
      },
      {
        text:
          "Tháo và ngâm tay cầm portafilter, basket, vòi steamer trong nước ấm pha Cafiza ít nhất 15 phút.",
      },
      {
        text:
          "Lau sạch vòi đánh sữa bằng khăn ẩm CHUYÊN DỤNG MÀU XANH — không dùng chung khăn lau quầy.",
        warning: true,
      },
      {
        text:
          "Đổ bã, rửa sạch knock box, ngăn chứa nước thải. Lau khô toàn bộ khu vực bar.",
      },
      {
        text:
          "Cất sữa, syrup, topping vào tủ lạnh — kiểm tra hạn sử dụng, ghi chú món sắp hết hạn lên bảng.",
      },
      {
        text:
          "Quét và lau sàn từ trong ra ngoài bằng dung dịch khử khuẩn pha đúng tỉ lệ trên nhãn chai.",
      },
      {
        text:
          "Tắt máy espresso, máy xay, đèn quầy. Kiểm tra cửa sau, cửa chính đã khóa và bật báo động.",
        warning: true,
      },
    ],
  },
  {
    id: "cash-count",
    title: "Kiểm đếm doanh thu cuối ca",
    category: "cash",
    estimatedMinutes: 15,
    iconName: "scale",
    description:
      "Quy trình đếm két, đối chiếu doanh thu POS và bàn giao tiền cuối ca.",
    steps: [
      {
        text:
          "Đóng ca trên POS, in báo cáo doanh thu (cash + chuyển khoản + ví điện tử).",
      },
      {
        text:
          "Kiểm đếm tiền mặt trong két 2 lần độc lập — 2 người đếm riêng để đối chiếu.",
        warning: true,
      },
      {
        text:
          "Trừ tiền sàn (ví dụ 500.000đ) để lại cho ca sau, tính tổng tiền nộp = đếm được − tiền sàn.",
      },
      {
        text:
          "So sánh tiền nộp với báo cáo POS phần \"Cash\". Lệch quá ±20.000đ phải báo quản lý ngay.",
        warning: true,
      },
      {
        text:
          "Cho tiền vào phong bì niêm phong, ghi: ngày, ca, người đếm, tổng tiền. Hai người ký.",
      },
      {
        text:
          "Cất phong bì vào két sắt văn phòng. Cập nhật log bàn giao ca trên hệ thống.",
        warning: true,
      },
    ],
  },
  {
    id: "fire-safety",
    title: "Xử lý khẩn cấp khi có cháy",
    category: "safety",
    estimatedMinutes: 5,
    iconName: "flame",
    description:
      "Quy trình ứng phó khi phát hiện cháy nhỏ tại quán.",
    steps: [
      {
        text:
          "Hô lớn \"CHÁY!\" 3 lần để cảnh báo đồng nghiệp và khách. Nhấn nút báo cháy gần nhất.",
        warning: true,
      },
      {
        text:
          "Ngắt cầu dao tổng nếu cháy do điện. Tuyệt đối KHÔNG dùng nước dập cháy điện hoặc cháy dầu.",
        warning: true,
      },
      {
        text:
          "Lấy bình chữa cháy ABC (bình bột) gần nhất: rút chốt, hướng vòi vào gốc lửa, bóp cò, quét ngang.",
      },
      {
        text:
          "Hướng dẫn khách di chuyển bình tĩnh ra cửa thoát hiểm. Không dùng thang máy. Kiểm điểm tập trung ngoài sân.",
        warning: true,
      },
      {
        text:
          "Gọi 114 (Cảnh sát PCCC) ngay khi an toàn — nói rõ địa chỉ, tình trạng cháy, có người mắc kẹt không.",
        warning: true,
      },
    ],
    tips: [
      "Vị trí bình chữa cháy: 1 sau quầy, 1 cạnh cửa bếp, 1 gần WC. Kiểm tra áp suất bình mỗi tháng.",
      "Số khẩn cấp: 114 cứu hỏa, 115 cấp cứu y tế, 113 công an.",
    ],
  },
  {
    id: "food-safety",
    title: "An toàn thực phẩm: sữa & topping",
    category: "safety",
    estimatedMinutes: 10,
    iconName: "shield-check",
    description:
      "Bảo quản và sử dụng sữa tươi, kem, topping đúng chuẩn vệ sinh.",
    steps: [
      {
        text:
          "Sữa tươi mở nắp ghi ngày giờ mở lên hộp bằng bút lông. Hạn dùng tối đa 3 ngày kể từ khi mở.",
      },
      {
        text:
          "Bảo quản sữa, kem tươi ở tủ lạnh ≤ 4°C. Kiểm tra nhiệt độ tủ 2 lần/ngày, ghi vào bảng theo dõi.",
      },
      {
        text:
          "Topping (trân châu, thạch, hạt) chế biến trong ngày, hết ca đổ bỏ phần thừa — không tái sử dụng qua đêm.",
      },
      {
        text:
          "Rửa tay bằng xà phòng tối thiểu 20 giây trước khi cầm topping, hoặc dùng găng tay dùng một lần.",
      },
      {
        text:
          "Muỗng múc topping mỗi loại có muỗng riêng, ngâm trong nước sạch khi không dùng — thay nước ngâm 2h/lần.",
      },
      {
        text:
          "Phát hiện sữa có mùi lạ, vón cục, đổi màu hoặc topping bị nhớt: ngừng dùng ngay, báo trưởng ca.",
      },
    ],
    tips: [
      "Áp dụng FIFO: hàng nhập trước dùng trước, hàng nhập sau xếp phía trong tủ.",
      "Không để sữa ngoài tủ lạnh quá 30 phút trong ca cao điểm.",
    ],
  },
];
