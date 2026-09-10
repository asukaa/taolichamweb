export const ICS_GUIDE_HASH = "#/huong-dan-ics";

export function isIcsGuideRoute(): boolean {
  return window.location.hash === ICS_GUIDE_HASH;
}

export function renderIcsGuidePage(): string {
  return `
    <div class="ics-guide">
      <a href="./" class="ics-guide-back">← Quay lại Âm Lịch Việt Nam</a>
      <h1>Hướng dẫn sử dụng file .ics (lịch nhắc việc)</h1>
      <p class="subtitle">Cách nhập file .ics do ứng dụng này xuất ra vào Google Calendar, Outlook và Apple Calendar.</p>

      <section class="card">
        <h2>1. File .ics là gì?</h2>
        <p>
          .ics (iCalendar) là định dạng file lịch chuẩn, được hầu hết các ứng dụng lịch điện tử hỗ trợ. Khi bạn
          bấm "Xuất file nhắc việc (.ics)", "Tải file .ics riêng" hay "Xuất lịch âm năm ... (.ics)" trên trang
          này, ứng dụng sẽ tạo ra một file .ics chứa toàn bộ các ngày giỗ (hoặc ngày âm lịch) đã tính sẵn ra
          dương lịch cho nhiều năm tới, kèm theo nhắc nhở (báo trước) theo số ngày/giờ/phút bạn đã cài ở mục
          "Nhắc trước". Bạn chỉ cần nhập file này một lần vào ứng dụng lịch quen dùng, các năm sau lịch sẽ tự
          nhắc mà không cần mở lại trang web này.
        </p>
      </section>

      <section class="card">
        <h2>2. Nhập vào Google Calendar</h2>
        <h3>Trên máy tính (calendar.google.com)</h3>
        <ol>
          <li>Đăng nhập Google Calendar bằng tài khoản Gmail của bạn.</li>
          <li>Bấm biểu tượng bánh răng ⚙️ (góc trên bên phải) → "Cài đặt".</li>
          <li>Ở cột bên trái, chọn "Nhập và xuất".</li>
          <li>Bấm "Chọn tệp trên máy tính của bạn", chọn file .ics vừa tải về từ trang này.</li>
          <li>Chọn lịch muốn thêm vào (có thể tạo lịch riêng tên "Ngày giỗ" để không lẫn với lịch cá nhân), rồi bấm "Nhập".</li>
        </ol>
        <h3>Trên điện thoại (Android/iOS)</h3>
        <p>
          Ứng dụng Google Calendar trên điện thoại chưa hỗ trợ nhập file .ics trực tiếp. Cách đơn giản nhất: mở
          file .ics đã tải trong ứng dụng Email hoặc Tệp/Files, chọn "Mở bằng" → Google Calendar (nếu máy có sẵn
          tùy chọn này), hoặc thực hiện bước "Nhập và xuất" ở trên bằng trình duyệt trên điện thoại — sự kiện sẽ
          tự đồng bộ về ứng dụng Google Calendar trên điện thoại ngay sau đó.
        </p>
      </section>

      <section class="card">
        <h2>3. Nhập vào Outlook</h2>
        <h3>Outlook trên máy tính (bản cài đặt/desktop)</h3>
        <ol>
          <li>Mở Outlook, vào "Tệp" (File) → "Mở & Xuất" (Open &amp; Export) → "Nhập/Xuất" (Import/Export).</li>
          <li>Chọn "Nhập tệp iCalendar (.ics) hoặc vCalendar" rồi bấm Tiếp theo.</li>
          <li>Chọn file .ics vừa tải về từ trang này.</li>
          <li>Chọn "Nhập vào lịch hiện tại" hoặc "Mở như lịch mới" (để tách riêng khỏi lịch cá nhân).</li>
        </ol>
        <p>Mẹo: bạn cũng có thể bấm đúp (double click) trực tiếp vào file .ics để Outlook tự mở và thêm nhanh.</p>
        <h3>Outlook trên web (outlook.com)</h3>
        <ol>
          <li>Vào mục "Lịch" (Calendar) bên trái.</li>
          <li>Bấm "Thêm lịch" (Add calendar) → "Tải lên từ tệp" (Upload from file).</li>
          <li>Chọn file .ics, chọn lịch muốn thêm vào, rồi bấm "Nhập" (Import).</li>
        </ol>
      </section>

      <section class="card">
        <h2>4. Nhập vào Apple Calendar (iPhone/iPad/Mac)</h2>
        <h3>Trên Mac</h3>
        <p>Bấm đúp vào file .ics — ứng dụng Lịch (Calendar) sẽ tự mở, chọn lịch muốn thêm vào rồi bấm "Thêm tất cả" (Add All).</p>
        <h3>Trên iPhone/iPad</h3>
        <p>
          Mở file .ics từ ứng dụng Mail hoặc Tệp (Files) — thường nhận được qua email hoặc AirDrop/tải về từ
          trình duyệt Safari — hệ thống sẽ hiện danh sách sự kiện, bấm "Thêm tất cả" (Add All) ở góc trên bên
          phải để nhập vào ứng dụng Lịch.
        </p>
      </section>

      <section class="card">
        <h2>5. Về nhắc nhở (báo trước)</h2>
        <p>
          Mỗi sự kiện trong file .ics đã kèm sẵn 1 lời nhắc (VALARM) theo đúng số ngày/giờ/phút bạn cài ở mục
          "Nhắc trước (khi xuất .ics)" trên trang chính, trước khi bấm xuất file. Ứng dụng lịch (Google/Outlook/Apple)
          sẽ tự hiển thị thông báo vào đúng thời điểm đó — bạn không cần cài đặt thêm gì khác sau khi nhập file.
        </p>
      </section>

      <section class="card">
        <h2>6. Một vài lưu ý</h2>
        <ul>
          <li>Nếu xuất lịch cho nhiều năm/nhiều sự kiện, file có thể hơi lớn — quá trình nhập vào ứng dụng lịch
            có thể mất vài giây, đây là bình thường.</li>
          <li>Nên chọn nhập vào một lịch riêng (không phải lịch chính) để dễ dàng ẩn/hiện hoặc xóa toàn bộ nếu
            cần xuất lại sau này (ví dụ khi bạn sửa hoặc thêm ngày giỗ mới trên trang này).</li>
          <li>Vì lịch âm không cố định theo dương lịch mỗi năm, nếu bạn chỉnh sửa hoặc thêm ngày giỗ mới, hãy
            xuất lại file .ics và nhập lại để lịch nhắc được cập nhật đầy đủ.</li>
        </ul>
      </section>

      <p class="ics-guide-source">
        Tham khảo thêm:
        <a href="https://boonygroup.com/blog/chi-tiet/huong-dan-su-dung-file-ics-tich-hop-vao-lich-dien-tu-google-calendar-outlook/" target="_blank" rel="noopener">
          Hướng dẫn sử dụng file .ics tích hợp vào lịch điện tử Google Calendar, Outlook — boonygroup.com
        </a>
      </p>

      <a href="./" class="ics-guide-back">← Quay lại Âm Lịch Việt Nam</a>
    </div>
  `;
}
