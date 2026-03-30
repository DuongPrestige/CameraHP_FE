# Tài liệu Giao thức API Giao Tiếp Backend (Đóng băng thành công)

Chào mừng Frontend Developer. Đây là bộ tài liệu đặc tả toàn bộ luồng rễ API mà Node.js đang cung cấp để gắn kết với Giao diện ứng dụng. Mọi Endpoint đều bắt đầu bằng gốc `http://{server_ip}:5000`.

## 1. Xác Thực Bảo Mật (Auth Module)
| Method | Endpoint | Yêu cầu JWT? | Body Input | Nội dung Trả về (Mô tả) |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Không | `username`, `password`, `full_name`, `email`, `role` | `Token` và Info của Nhân viên vừa khởi tạo. |
| `POST` | `/api/auth/login` | Không | `username`, `password` | Dãy mã `Token` JWT (Hết hạn 24h) dùng để dắt vào các API dưới. |

## 2. Quản Trị Hệ Thống (Locations & Devices)
| Method | Endpoint | Yêu cầu JWT? | Body Input | Nội dung Trả về (Mô tả) |
| --- | --- | --- | --- | --- |
| `GET` | `/api/locations` | **Có** | Trống | Danh sách Tòa nhà / Kho. |
| `POST` | `/api/locations` | **Có** | `name`, `description` | Khởi tạo Khối Vị Trí. |
| `GET` | `/api/devices` | **Có** | Trống | Toàn bộ thông tin NVR (Ngoại trừ Mật khẩu). Nối List `cameras`. |
| `POST` | `/api/devices` | **Có** | `ip_address`, `username`, `password`, `location_id` | Lập máy NVR mới (Password tự hóa mã AES). |
| `DELETE` | `/api/devices/:id` | **Có** | Trống | Băm NVR và Toàn bộ Camera con của nó thành tro. |

## 3. Quản Trị Camera Lẻ (Phase 5)
| Method | Endpoint | Yêu cầu JWT? | Body Input | Nội dung Trả về (Mô tả) |
| --- | --- | --- | --- | --- |
| `POST` | `/api/devices/:id/sync-cameras` | **Có** | Trống | (NÚT SYNC). Lệnh cho Node.js lao tới NVR tải và rải toàn bộ lưới Camera vào CSDL. Cập nhật Status Live luôn. |
| `GET` | `/api/cameras` | **Có** | Query: `?page`, `?limit`, `?device_id`, `?location_id` | Danh sách Camera 3 Chiều (Join cùng tên Tòa nhà và IP NVR). |
| `PUT` | `/api/cameras/:id` | **Có** | `name`, `location_id` | Đổi thẻ tên Alias Camera và Thuyên chuyển Tòa nhà lưu trữ. |

## 4. Quản lý Sự Cố (Incidents & Alarms)
| Method | Endpoint | Yêu cầu JWT? | Body Input | Nội dung Trả về (Mô tả) |
| --- | --- | --- | --- | --- |
| `GET` | `/api/incidents` | **Có** | Query: `?status`, `?device_id`, `?page` | Danh bạ Tickets đỏ (KTV dùng cái này để bốc việc). |
| `POST` | `/api/incidents` | **Có** | `device_id`, `camera_id` (Opt), `error_type` | Cấp thẻ lỗi Thủ Công. |
| `PUT` | `/api/incidents/:id` | **Có** | `status` (PROCESSING, RESOLVED), `resolve_note` | Chuyển Vòng đời Thẻ Phạt. Backend tự đọc JWT và Gắn mác Tên Kỹ thuật viên (technician_id) vào Thẻ. |
| `POST` | `/api/webhooks/hikvision` | **KHÔNG** | (XML Body từ NVR truyền tới) | Sinh thẻ PENDING. Frontend Không gọi hàm này. |

## 5. Thống Kê Tổng Lực (Dashboard)
| Method | Endpoint | Yêu cầu JWT? | Body Input | Nội dung Trả về (Mô tả) |
| --- | --- | --- | --- | --- |
| `GET` | `/api/stats/dashboard` | **Có** | Trống | Bảng JSON Tổng số đếm NVR, Tổng Camera, Bảng Trạng thái Tickets (PENDING/RESOLVE). |

---

# BỘ TÀI LIỆU SÓNG THỜI GIAN THỰC (WebSockets)

Frontend hãy cấu hình Script `socket.io-client` kết nối thẳng vào `ws://{server_ip}:5000` (Socket lắng nghe ở chung thư mục cổng với giao thức HTTP).

Hệ thống cung cấp 3 Kênh Sóng bắt buộc lắng nghe (Listeners `socket.on(...)`) để tạo Chuông Vòng Lặp. Các sóng này sẽ bay tới khi KTV khác đổi Ticket hoặc NVR vỡ kịch bản:

1. **KÊNH `new_incident`**
   - **Hoàn cảnh Reo:** Khi có Ticket rủi ro mới vừa được Đẻ ra (Do NVR gửi Webhook, Do Lính Tuần Tra CronJob, hoặc KTV tạo tay).
   - **Cấu trúc Hứng (Payload):** `{ incident: Object, detail: "Loại lỗi Còi Báo Động (String)" }`

2. **KÊNH `incident_updated`**
   - **Hoàn cảnh Reo:** Khi một Ai đó (Bất kể ở IP nào) bấm Tiến Hành Sửa, hoặc Bấm Hoàn Tất Lệnh, hoặc ghi Chú thích. (Mục đích giúp toàn bộ trình duyệt của ae khác trong Đội KTV phải Live-Reload tự đổi màu cục Thẻ mác đó).
   - **Cấu trúc Hứng:** `{ incident: Object_đã_làm_mới, message: "Trạng thái mới..." }`

3. **KÊNH `device_status_change`**
   - **Hoàn cảnh Reo:** Thằng Đếm Nhịp Cronjob Vừa chẩn đoán thấy 1 cái NVR vừa Từ Cõi Chết Sống Lại hoặc Đứt Cáp (`OFFLINE` -> `ONLINE`).
   - **Cấu trúc Hứng:** `{ device_id: X, ip: Y, status: "ONLINE", message: "Ghi chú log" }`

**Lệnh Kết Luận Kiến Trúc Sự:** "Giai Đoạn API Kín Đã Được Mồi Chuẩn Xác 100%. Vui Lòng Tiến Hành Quá Trình Nhào Nặn Màn Hình Dashboard Phân Tích Tổng Quát (React)!"
