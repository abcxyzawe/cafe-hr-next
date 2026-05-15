# Cafe HR — Next.js Edition

Hệ thống quản lý nhân sự quán cà phê — phiên bản nâng cấp với stack hiện đại.

## Tính năng

- **Auth** (JWT cookie + bcrypt) — login required, middleware bảo vệ tất cả routes
- Quản lý nhân viên (CRUD + 4 vai trò: pha chế / phục vụ / thu ngân / quản lý)
- Lập lịch ca làm (sáng / chiều / tối) — chọn ngày, theo nhân viên
- Chấm công nhanh (check-in / check-out với trạng thái real-time)
- Bảng lương tự động theo kỳ (YYYY-MM) — biểu đồ Recharts
- **Avatar AI**: sinh ảnh chân dung nhân viên bằng Grok image API (xAI)
- UI design assets (hero banner, role illustrations) đều được sinh bằng Grok

## Stack

| Layer    | Tech                                                      |
|----------|-----------------------------------------------------------|
| Framework| **Next.js 16** (App Router, React 19, TypeScript)         |
| Style    | **Tailwind CSS v4** + custom design tokens (theme cà phê) |
| UI       | shadcn-style components (Button, Card, Table, ...)        |
| DB       | **PostgreSQL 16** (qua Docker, không SQLite)              |
| ORM      | **Prisma 7** với `@prisma/adapter-pg`                     |
| Form     | Server Actions + `useActionState` + zod validation        |
| Charts   | Recharts                                                  |
| Toast    | Sonner                                                    |
| AI       | xAI Grok `grok-imagine-image` cho avatar & UI design      |

## Cài đặt

### 1. Cài deps

```bash
npm install
```

### 2. Khởi động PostgreSQL (Docker)

```bash
npm run db:up      # docker compose up -d
```

Hoặc dùng Neon / Supabase free tier và set `DATABASE_URL` trong `.env`.

### 3. Cấu hình `.env`

Copy `.env.example` → `.env` và điền:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cafe_hr?schema=public"
XAI_API_KEY="xai-..."
XAI_IMAGE_MODEL="grok-imagine-image"
# Bắt buộc — sinh bằng: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_SECRET="..."
```

Sau khi `npm run seed`, đăng nhập tại `/login` với:
- Email: `admin@cafe.vn`
- Mật khẩu: `admin`

### 4. Khởi tạo schema + seed

```bash
npm run db:push    # tạo tables (hoặc db:migrate để track migrations)
npm run seed       # nạp dữ liệu mẫu (tự động import từ cafe-hr SQLite nếu có)
```

### 5. Chạy dev server

```bash
npm run dev
# http://localhost:3000
```

## Cấu trúc thư mục

```
cafe-hr-next/
├── prisma/
│   ├── schema.prisma            # Models: Employee, Shift, Attendance, Payroll
│   └── seed.ts                  # Seed + migrate từ SQLite cũ
├── prisma.config.ts             # Prisma 7 config (datasource URL)
├── docker-compose.yml           # PostgreSQL 16
├── public/
│   ├── grok-assets/             # UI design images sinh bằng Grok
│   └── avatars/                 # Avatar nhân viên đã sinh (persist)
└── src/
    ├── app/
    │   ├── layout.tsx           # Root layout với sidebar
    │   ├── page.tsx             # Dashboard
    │   ├── employees/           # CRUD nhân viên + Grok avatar
    │   ├── shifts/              # Lịch ca làm
    │   ├── attendance/          # Chấm công
    │   └── payroll/             # Bảng lương + chart
    ├── components/
    │   ├── ui/                  # shadcn-style primitives
    │   └── layout/              # Sidebar, TopBar, MobileNav
    └── lib/
        ├── prisma.ts            # Singleton Prisma client với pg adapter
        ├── utils.ts             # formatVND, formatHours, ROLE_LABELS, cn
        └── xai.ts               # Grok image API wrapper
```

## Scripts

```bash
npm run dev          # Next.js dev (localhost:3000)
npm run build        # Production build
npm run db:up        # Docker postgres up
npm run db:down      # Docker postgres down
npm run db:push      # Sync schema (dev fast)
npm run db:migrate   # Create migration (prod)
npm run db:studio    # Prisma Studio GUI
npm run seed         # Seed sample / migrate SQLite cũ
```

## Migration từ phiên bản cũ

Bản cũ ở `../cafe-hr/` (Express + SQLite). Khi chạy `npm run seed`, script tự động:
1. Kiểm tra `cafe-hr/data/cafe_hr.db` có tồn tại không
2. Nếu có, dùng `better-sqlite3` từ `cafe-hr/node_modules` đọc dữ liệu employees và import sang Postgres
3. Nếu không, seed dữ liệu mẫu Việt Nam

## Grok image generation

- **Avatar nhân viên**: gọi `generateAvatarForEmployee(id)` server action — sinh ảnh → download → lưu vào `public/avatars/emp-{id}-{ts}.jpg` → cập nhật DB.
- **UI design assets**: pre-generated bằng `cafe-hr/scripts/gen_ui_assets.js` (chạy một lần khi setup), lưu vào `public/grok-assets/`.

Model mặc định: `grok-imagine-image`. Có thể đổi sang `grok-imagine-image-pro` hoặc `grok-imagine-image-quality` qua biến `XAI_IMAGE_MODEL`.
