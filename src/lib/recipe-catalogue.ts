export type Recipe = {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  brewTimeSeconds: number;
  ratio: string;
  equipment: string[];
  steps: string[];
  iconName: "coffee" | "milk" | "thermometer" | "snowflake" | "leaf";
  category: "espresso" | "milk" | "cold" | "tea";
};

export const RECIPES: Recipe[] = [
  {
    id: "espresso-truyen-thong",
    name: "Espresso truyền thống",
    difficulty: "medium",
    brewTimeSeconds: 28,
    ratio: "1:2",
    equipment: ["Máy pha espresso", "Cối xay", "Tamper", "Cân điện tử"],
    steps: [
      "Xay 18g cà phê arabica ở mức xay mịn dành cho espresso.",
      "Dàn đều bột trong basket portafilter và tamp đều tay với lực ~15kg.",
      "Lắp portafilter, bấm chiết và bắt đầu bấm giờ.",
      "Mục tiêu chiết được 36g espresso trong khoảng 25-30 giây.",
      "Quan sát dòng chảy: màu hổ phách, đuôi vàng nhạt là đạt.",
      "Phục vụ ngay trong tách sứ đã được làm ấm trước.",
    ],
    iconName: "coffee",
    category: "espresso",
  },
  {
    id: "latte-co-dien",
    name: "Latte cổ điển",
    difficulty: "medium",
    brewTimeSeconds: 90,
    ratio: "1:5",
    equipment: ["Máy pha espresso", "Ca đánh sữa", "Nhiệt kế"],
    steps: [
      "Chiết một shot espresso đôi (36g) vào ly latte 220ml.",
      "Rót 150ml sữa tươi nguyên kem lạnh vào ca inox.",
      "Đánh sữa với vòi hơi: kéo khí 3-4 giây rồi nhấn sâu để xoáy đều.",
      "Dừng đánh khi sữa đạt 60-65°C, bề mặt mịn như sơn bóng.",
      "Đập nhẹ ca xuống bàn rồi xoay tròn để đồng nhất kết cấu.",
      "Rót sữa từ cao xuống thấp, kết thúc bằng đường lượn để tạo hình lá.",
    ],
    iconName: "milk",
    category: "milk",
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    difficulty: "medium",
    brewTimeSeconds: 75,
    ratio: "1:1:1",
    equipment: ["Máy pha espresso", "Ca đánh sữa", "Tách cappuccino 150ml"],
    steps: [
      "Chiết một shot espresso đơn (18g) vào tách cappuccino đã hâm.",
      "Đánh 100ml sữa tươi lạnh, kéo khí lâu hơn latte để có nhiều bọt mịn.",
      "Mục tiêu đạt sữa 60°C với lớp bọt dày khoảng 1-1.5cm.",
      "Khuấy nhẹ ca để bọt và sữa lỏng hoà quyện đồng đều.",
      "Rót sữa thật chậm để bọt nổi lên trên, cân bằng 1/3 espresso, 1/3 sữa, 1/3 bọt.",
      "Rắc một chút bột ca cao hoặc quế lên mặt nếu khách yêu cầu.",
    ],
    iconName: "milk",
    category: "milk",
  },
  {
    id: "macchiato",
    name: "Macchiato",
    difficulty: "easy",
    brewTimeSeconds: 45,
    ratio: "1:0.5",
    equipment: ["Máy pha espresso", "Ca đánh sữa nhỏ", "Tách demitasse"],
    steps: [
      "Chiết một shot espresso đôi vào tách demitasse 90ml.",
      "Đánh khoảng 50ml sữa tươi tới khi có lớp bọt mịn dày.",
      "Dùng thìa nhỏ múc một lượng bọt sữa đặt nhẹ lên trung tâm crema.",
      "Phục vụ ngay để không làm vỡ điểm sữa trên mặt espresso.",
    ],
    iconName: "coffee",
    category: "espresso",
  },
  {
    id: "mocha",
    name: "Mocha",
    difficulty: "medium",
    brewTimeSeconds: 110,
    ratio: "1:1:4",
    equipment: ["Máy pha espresso", "Ca đánh sữa", "Sốt chocolate"],
    steps: [
      "Cho 20ml sốt chocolate đen vào đáy ly thuỷ tinh 240ml.",
      "Chiết một shot espresso đôi (36g) trực tiếp lên sốt và khuấy đều.",
      "Đánh 150ml sữa tươi đạt 60°C với lớp bọt mỏng vừa.",
      "Rót sữa từ từ vào ly, giữ lớp bọt nổi đều trên bề mặt.",
      "Trang trí bằng kem tươi đánh bông và rắc bột ca cao.",
      "Phục vụ kèm thìa dài để khuấy lớp chocolate lắng dưới đáy.",
    ],
    iconName: "coffee",
    category: "milk",
  },
  {
    id: "cold-brew",
    name: "Cold brew",
    difficulty: "easy",
    brewTimeSeconds: 43200,
    ratio: "1:8",
    equipment: ["Bình ủ cold brew", "Túi lọc vải", "Cân điện tử"],
    steps: [
      "Xay thô 100g cà phê (mức xay như muối hột).",
      "Cho cà phê vào túi lọc, đặt trong bình rồi đổ 800ml nước lọc nhiệt độ phòng.",
      "Khuấy nhẹ để toàn bộ bột thấm đều nước.",
      "Đậy nắp và ủ trong tủ mát 12-16 giờ tuỳ độ đậm mong muốn.",
      "Lấy túi lọc ra, lọc lại qua giấy nếu muốn nước trong hơn.",
      "Rót ra ly đầy đá, có thể pha loãng với nước hoặc sữa theo tỉ lệ 1:1.",
    ],
    iconName: "snowflake",
    category: "cold",
  },
  {
    id: "iced-americano",
    name: "Iced Americano",
    difficulty: "easy",
    brewTimeSeconds: 60,
    ratio: "1:4",
    equipment: ["Máy pha espresso", "Ly thuỷ tinh 360ml", "Đá viên"],
    steps: [
      "Cho đá viên đầy 2/3 ly thuỷ tinh.",
      "Rót khoảng 150ml nước lọc lạnh lên đá.",
      "Chiết một shot espresso đôi (36g) vào ly riêng.",
      "Rót espresso từ từ lên đá để giữ lớp crema nổi đẹp trên mặt.",
      "Phục vụ kèm ống hút và khuấy nhẹ trước khi uống.",
    ],
    iconName: "snowflake",
    category: "cold",
  },
  {
    id: "ca-phe-sua-da",
    name: "Cà phê sữa đá Việt Nam",
    difficulty: "easy",
    brewTimeSeconds: 240,
    ratio: "1:2 (cà phê:sữa)",
    equipment: ["Phin nhôm", "Sữa đặc", "Ly thuỷ tinh 240ml"],
    steps: [
      "Cho 25g cà phê robusta xay vừa vào phin, lắc nhẹ cho phẳng mặt.",
      "Đặt nắp gài lên bột, đổ 20ml nước sôi để ủ trong 30 giây.",
      "Châm tiếp 70ml nước sôi 95°C rồi đậy nắp, để nhỏ giọt 4-5 phút.",
      "Trong lúc chờ, cho 25ml sữa đặc vào đáy ly riêng.",
      "Khi phin nhỏ giọt xong, khuấy đều cà phê với sữa đặc.",
      "Cho đá viên vào ly thứ hai và rót hỗn hợp lên trên, khuấy nhẹ trước khi uống.",
    ],
    iconName: "coffee",
    category: "cold",
  },
  {
    id: "bac-xiu",
    name: "Bạc xỉu",
    difficulty: "easy",
    brewTimeSeconds: 240,
    ratio: "1:4 (cà phê:sữa)",
    equipment: ["Phin nhôm", "Sữa đặc", "Sữa tươi không đường"],
    steps: [
      "Pha cà phê phin với 20g cà phê và 60ml nước sôi như cách thông thường.",
      "Cho 30ml sữa đặc và 60ml sữa tươi không đường vào ly.",
      "Khi cà phê chảy xong, rót khoảng 30ml cà phê vào hỗn hợp sữa.",
      "Khuấy đều để sữa và cà phê hoà quyện thành màu nâu sữa nhạt.",
      "Thêm đá viên đầy ly và phục vụ ngay khi còn lạnh.",
    ],
    iconName: "milk",
    category: "milk",
  },
  {
    id: "tra-o-long-sua",
    name: "Trà ô long sữa",
    difficulty: "medium",
    brewTimeSeconds: 300,
    ratio: "1:10",
    equipment: ["Bình ủ trà", "Rây lọc", "Sữa tươi", "Đường nước"],
    steps: [
      "Cho 10g trà ô long vào bình, tráng nhanh bằng nước 90°C rồi đổ bỏ.",
      "Châm 200ml nước 90°C, ủ trà trong 4-5 phút để chiết đủ vị.",
      "Lọc bỏ bã trà, để nước trà nguội bớt còn khoảng 60°C.",
      "Cho 20ml đường nước và 80ml sữa tươi không đường vào ly.",
      "Rót nước trà vào ly và khuấy đều cho sữa hoà tan hoàn toàn.",
      "Thêm đá viên đầy ly, có thể bổ sung trân châu nếu khách yêu cầu.",
    ],
    iconName: "leaf",
    category: "tea",
  },
];

export function getRecipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

export type RecipeCategory = Recipe["category"];

export const CATEGORY_LABEL: Record<RecipeCategory, string> = {
  espresso: "Espresso",
  milk: "Sữa",
  cold: "Lạnh",
  tea: "Trà",
};
