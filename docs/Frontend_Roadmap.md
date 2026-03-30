# Lộ trình Phát triển Frontend (React NVR Monitoring Dashboard)

Tài liệu này phân rã toàn bộ quá trình xây dựng Frontend thành từng giai đoạn cụ thể. Sau mỗi giai đoạn, tôi sẽ cập nhật báo cáo tiến độ và nghiệm thu thành quả.

---

## 🟢 Giai đoạn 1: Thiết lập Hệ thống (Base Setup) & Đăng nhập
**Mục tiêu:** Dựng bộ khung công nghệ chuẩn và hoàn thiện màn hình Đăng nhập công khai.
- **Công việc:**
  1. Khởi tạo dự án React bằng Vite.
  2. Cài đặt và cấu hình **Tailwind CSS** (kết hợp cấu hình chuẩn màu sắc cho Dark Mode/Glassmorphism).
  3. Cài đặt các thư viện lõi: React Router DOM, Axios, Zustand, Lucide-React.
  4. Cấu hình cấu trúc thư mục (components, pages, stores, services).
  5. Xây dựng trang `/login` (Giao diện thẩm mỹ cao, Form đăng nhập cơ bản).
- **Nghiệm thu:** Ứng dụng chạy được, hiển thị trang Đăng Nhập cực kỳ chuyên nghiệp. Cấu trúc thư mục ngăn nắp.

## 🟢 Giai đoạn 2: Tích hợp Xác thực (Auth) & Admin Layout
**Mục tiêu:** Người dùng đăng nhập được, lưu Token an toàn và truy cập vào khung giao diện quản trị.
- **Công việc:**
  1. Cấu hình Axios Interceptors tự động đính kèm `Authorization: Bearer <Token>`.
  2. Quản lý trạng thái User bằng state `Zustand`.
  3. Bảo vệ các tuyến đường riêng tư (`Private Routes`) - Không có token sẽ tự động đẩy về `/login`.
  4. Xây dựng **AdminLayout Component**: Có Sidebar điều hướng, Header chứa Profile, Nút Log out và Chuông thông báo nhỏ.
- **Nghiệm thu:** Đăng nhập thành công, token lưu vào LocalStorage, tự động chặn quyền nếu chưa Login. Giao diện Sidebar hiển thị đẹp.

## 🟢 Giai đoạn 3: Quản trị Vị trí & Trung tâm NVR (Locations & Devices)
**Mục tiêu:** Kỹ thuật viên thao tác được dữ liệu nền (Building & Máy thu hình NVR).
- **Công việc:**
  1. Trang `/locations`: Fetch API GET và thiết kế Modal/Bảng POST để thêm mới Vị trí.
  2. Trang `/devices`: 
      - Lấy danh sách thiết bị.
      - Chức năng Form thêm NVR.
      - Tích hợp chuẩn giao diện hiển thị cho việc Xóa (Thùng rác đỏ) và Nút [Sync Cameras].
- **Nghiệm thu:** Render bảng NVR chuẩn UI. Các API thêm, xóa đều thông báo trả về (Toast Messages) thành công.

## 🟢 Giai đoạn 4: Danh mục Camera Lẻ & Dashboard Thống kê
**Mục tiêu:** Hiển thị trực quan toàn bộ mạng lưới Camera và biểu đồ tổng hợp năng lực hệ thống.
- **Công việc:**
  1. Trang `/cameras`: Thiết kế dạng lướt Grid Card, tải phân trang dữ liệu Camera, phân màu Live/Offline đẹp mắt. Bộ lọc theo Building.
  2. Chức năng đổi tên Camera (PUT /api/cameras/:id).
  3. Trang chủ `/dashboard`: Fetch `GET /api/stats/dashboard`. Cài đặt thư viện **Recharts** để vẽ các biểu đồ tròn (Pie Chart) và biểu đồ cột về tình trạng thiết bị.
- **Nghiệm thu:** Dashboard chạy mượt mà, layout chuyên nghiệp có số liệu cụ thể. Các Camera hiển thị sắc nét.

## 🟢 Giai đoạn 5: Tích hợp Lõi WebSockets & Xử lý Sự Cố (Incidents)
**Mục tiêu:** Trái tim của hệ thống giám sát thời gian thực. Báo động nhấp nháy, tự động render log Kỹ thuật.
- **Công việc:**
  1. Màn hình `/incidents`: Giao diện bảng Kanban hoặc Danh sách (Pending/Processing/Resolved) để KTV nhận việc sửa lỗi. Dùng API PUT chuyển trạng thái.
  2. Cài đặt **`socket.io-client`**. Lắng nghe 3 kênh sóng của Backend.
  3. Khi có *mới*: Đẩy Popup Toast đỏ chớp nháy, rung chuông trên Header, cập nhật Cột Pending tự động.
  4. Khi có *thay đổi trạng thái NVR*: Render lại tức thời dòng list ở `/devices` và `/cameras`.
- **Nghiệm thu:** Mở 2 Tab trình duyệt, giả lập 1 Tab xử lý Ticket thì Tab kia báo số trực tiếp. Bắn Webhook Postman giả lập lỗi thấy Frontend reo chuông.

## 🟢 Giai đoạn 6: Final Polish
**Mục tiêu:** Kiểm tra lại lần cuối tính đồng bộ, bắt Bug hiển thị. Tối ưu code trước khi release.
