# Lịch âm và lời nhắc lịch âm

Web app (PWA) giúp nhập ngày giỗ theo âm lịch Việt Nam, tự động quy đổi sang ngày dương lịch cho các năm
tiếp theo, tra cứu lịch âm hàng ngày, và xuất ra lịch nhắc (kèm báo trước) để đưa vào ứng dụng lịch
(Google Calendar, Outlook, Apple Calendar...).
Thuật toán tính lịch âm được lấy từ code của Hồ Ngọc Đức 
Bản demo trực tuyến: **https://al.28082024.xyz/**

## Tính năng

### Tra cứu lịch âm
<img width="879" height="756" alt="1" src="https://github.com/user-attachments/assets/9b323109-f5e5-4e13-a0f2-0089f9f5454d" />


- Xem lịch tháng bất kỳ: chọn nhanh tháng (dropdown) và năm (gõ trực tiếp hoặc bấm nút ▲▼), nút "Hôm nay" để
  quay lại tháng hiện tại.
- Mỗi ô ngày hiện cả ngày dương và ngày âm nhỏ bên dưới (hiện "ngày/tháng" vào đầu tháng âm và vào ngày
  đầu/cuối tháng dương để dễ biết tháng dương đó trải trên (những) tháng âm nào); cột "Tuần" hiện số tuần
  trong năm; cột Thứ 7/Chủ Nhật và ngày lễ âm lịch được tô màu riêng.
- Bấm vào 1 ngày sẽ hiện popup chi tiết: ngày dương lịch, ngày âm lịch, Can Chi của ngày/tháng/năm (Lục thập
  hoa giáp), và tiết khí tương ứng.
- Nút **"Lịch năm"** mở popup xem cả 12 tháng của 1 năm cùng lúc (tiêu đề "Năm ... - Can Chi năm đó", có nút
  ▲▼ đổi năm ngay trong popup); bấm ngày trong lịch năm cũng ra đúng popup chi tiết như trên.
- **Ngày lễ/tết âm lịch** được nhận diện và tô màu sẵn: Tết Nguyên Đán, Tết Nguyên Tiêu, Tết Hàn Thực, Giỗ Tổ
  Hùng Vương, Lễ Phật Đản, Tết Đoan Ngọ, Lễ Vu Lan (Rằm tháng Bảy), Tết Trung Thu, Tết Ông Công Ông Táo.
- Nút **"Xuất lịch âm (.ics)"** ở cuối bảng: xuất mỗi ngày trong 1 khoảng năm tùy chọn ("Từ năm" - "Đến năm")
  thành 1 sự kiện, tiêu đề "ngày/tháng âm" (kèm tên ngày lễ nếu có) - dùng để import lịch âm phủ lên lịch
  dương trong bất kỳ ứng dụng lịch nào.

### Quản lý ngày giỗ
<img width="877" height="707" alt="2" src="https://github.com/user-attachments/assets/9b88b7ce-781b-404a-a0f5-db330e91aa46" />

- Thêm/sửa/xóa trực tiếp trong app (không cần Excel), lưu trên trình duyệt của bạn (không gửi lên máy chủ
  nào).
- **Tự động xác định tháng nhuận**: nhập thêm năm mất (dương lịch, không bắt buộc), hệ thống tự tính xem
  ngày âm đó là tháng thường hay tháng nhuận trong năm đó; nếu năm đó có cả 2 khả năng, app sẽ hỏi lại thay
  vì đoán sai; nếu không nhập năm mất và cũng không tick "Tháng nhuận", app sẽ hỏi xác nhận trước khi lưu.
- **Xem trước nhiều năm**: bảng xem trước hiển thị ngày âm, thứ trong tuần, và ngày dương lịch tương ứng cho
  từng năm sắp tới (số năm tạo lịch tùy chỉnh được).
<img width="879" height="699" alt="3" src="https://github.com/user-attachments/assets/78f2bdf5-ed2a-41db-845a-d31a2cdfbcbe" />

### Nhập / xuất dữ liệu

- **Excel**: tải file mẫu, nhập danh sách từ file `.xlsx` (đọc được cả file `Ngay gio.xlsx` của bản desktop
  cũ), xuất danh sách hiện tại ra Excel.
- **Lịch nhắc `.ics`**: xuất từng người hoặc tất cả; mỗi sự kiện bắt đầu 00:00 và kết thúc 23:59 đúng ngày
  hôm đó.
- **Lời nhắc (VALARM)**: tùy chỉnh báo trước bao nhiêu Ngày/Giờ/Phút (mặc định 1 ngày); nội dung lời nhắc tự
  ghép dạng "<thời gian> nữa là tới <nhãn sự kiện>" (vd "1 ngày nữa là tới Giỗ Ông Nội").

### Khác

- **Chạy offline**: là PWA (Progressive Web App) - sau lần mở đầu tiên có mạng, có thể cài vào máy/điện
  thoại và dùng tiếp không cần Internet.
- Toàn bộ phép tính âm lịch dùng **múi giờ Việt Nam (UTC+7)**, không phải múi giờ Trung Quốc (UTC+8) - hai
  cách tính đôi khi cho ra ngày âm lịch khác nhau 1 ngày.

## Chạy thử / phát triển

Yêu cầu: [Node.js](https://nodejs.org) (bản 20 trở lên).

```bash
npm install       # cài dependency
npm run dev       # chạy server phát triển, mở link hiện ra trên trình duyệt
npm test          # chạy bộ test tự động
npm run build     # build bản production vào thư mục dist/
npm run preview   # xem thử bản build production
```

## Cấu trúc thư mục

```
src/
  core/            # thuật toán lịch âm, Can Chi, tiết khí, ngày lễ, quy đổi ngày lặp lại hàng năm
  models/          # kiểu dữ liệu 1 "ngày giỗ"
  storage/         # lưu/đọc danh sách trên localStorage
  services/        # xuất/nhập Excel, xuất .ics (kèm VALARM), tải file
  ui/              # giao diện: bảng tra cứu (tháng/năm), form, danh sách, bảng xem trước
```

## Deploy

Mỗi lần push lên nhánh `master`, GitHub Actions (`.github/workflows/deploy.yml`) sẽ tự chạy test, build, và
deploy lên GitHub Pages.
