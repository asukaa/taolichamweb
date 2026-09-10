let helpOpen = false;
let donateOpen = false;

const DONOR_BANK = "vietcombank";
const DONOR_ACCOUNT_NO = "1028502969";
const DONOR_ACCOUNT_NAME = "PHAM DINH THAP";
const VIETQR_IMAGE_URL = `https://img.vietqr.io/image/${DONOR_BANK}-${DONOR_ACCOUNT_NO}-qr_only.png?accountName=${encodeURIComponent(DONOR_ACCOUNT_NAME)}`;

export function renderHelpButton(): string {
  return `<button type="button" id="open-help" class="icon-btn" aria-label="Hướng dẫn sử dụng" title="Hướng dẫn sử dụng">ⓘ</button>`;
}

export function renderDonateButton(): string {
  return `<button type="button" id="open-donate" class="donate-btn">☕ Ủng hộ dự án</button>`;
}

function renderHelpModal(): string {
  if (!helpOpen) return "";
  return `
    <div class="info-modal-backdrop" id="help-backdrop">
      <div class="info-modal" role="dialog" aria-modal="true" aria-label="Hướng dẫn sử dụng">
        <button type="button" class="info-modal-close" id="help-close" aria-label="Đóng">×</button>
        <h2>Hướng dẫn sử dụng</h2>

        <h3>1. Tra cứu lịch âm - dương</h3>
        <ul>
          <li>Chọn tháng bằng dropdown hoặc nút "‹ ›"; gõ trực tiếp số năm vào ô năm hoặc dùng nút "▲ ▼".</li>
          <li>Bấm "Hôm nay" để quay về ngày hiện tại.</li>
          <li>Bấm vào 1 ô ngày để xem chi tiết: ngày dương, ngày âm, Can Chi ngày/tháng/năm, tiết khí, ngày lễ/tết
            âm lịch (nếu có) và thông tin tháng nhuận của năm đó.</li>
          <li>Bấm "Lịch năm" để xem cả 12 tháng cùng lúc; gõ số năm trực tiếp vào ô năm ở đầu bảng hoặc dùng "▲ ▼".
            Năm nào có tháng nhuận sẽ có chữ "(nhuận)" ngay cạnh tên năm (Can Chi).</li>
          <li>Ô có chấm xanh ở góc phải là ngày thuộc tháng nhuận; ô tô màu vàng là ngày lễ/tết âm lịch.</li>
          <li>Chọn "Từ năm" / "Đến năm" rồi bấm "Xuất lịch âm ... (.ics)" để tải file chứa toàn bộ ngày âm của các
            năm đó, nhập được vào Google Calendar, Outlook, Apple Calendar...</li>
        </ul>

        <h3>2. Tạo lịch nhắc công việc (giỗ, kỵ nhật...)</h3>
        <ul>
          <li>Nhập "Họ và Tên", "Tên sự kiện" (VD: Giỗ Ông Nội), "Ngày âm lịch" và "Tháng âm lịch".</li>
          <li>Chọn "Loại tháng": Tháng thường hoặc Tháng nhuận (mặc định là Tháng thường).</li>
          <li>Nhập "Năm mất (dương lịch)" nếu biết — hệ thống sẽ tự xác định đúng tháng nhuận/thường thay vì phải
            tự chọn.</li>
          <li>Tháng nhuận không lặp lại mỗi năm. Nếu chọn "Tháng nhuận": năm nào âm lịch thực sự có đúng tháng
            nhuận đó thì lấy theo tháng nhuận, còn các năm khác sẽ tự động lấy theo tháng thường tương ứng, để
            việc cúng giỗ vẫn diễn ra đều đặn mỗi năm theo đúng phong tục.</li>
          <li>"Ghi chú thêm..." dùng để ghi chú tự do (giờ mất, địa điểm...).</li>
          <li>Bấm "Thêm" để lưu lại.</li>
        </ul>

        <h3>3. Quản lý danh sách đã lưu</h3>
        <ul>
          <li>"Xem trước": xem bảng ngày dương lịch tương ứng của nhiều năm tới.</li>
          <li>"Sửa" / "Xóa": chỉnh sửa hoặc xóa từng mục.</li>
          <li>"Tải file .ics riêng": xuất file lịch nhắc cho riêng 1 sự kiện.</li>
        </ul>

        <h3>4. Cài đặt chung</h3>
        <ul>
          <li>"Tạo lịch cho bao nhiêu năm tới": số năm được tính trước cho bảng xem trước và khi bấm "Tải tất cả
            (.ics)".</li>
          <li>"Nhắc trước (khi xuất .ics)": số ngày/giờ/phút hệ thống sẽ nhắc trước ngày giỗ trong file .ics.</li>
        </ul>

        <h3>5. Nhập / xuất dữ liệu</h3>
        <ul>
          <li>"Tải file mẫu (.xlsx)": tải file Excel mẫu để điền hàng loạt.</li>
          <li>"Nhập từ Excel": nhập danh sách từ file Excel đã điền theo mẫu.</li>
          <li>"Xuất ra Excel": xuất toàn bộ danh sách hiện có ra file Excel để lưu trữ hoặc chia sẻ.</li>
          <li>"Tải tất cả (.ics)": xuất file lịch nhắc chứa tất cả sự kiện đã lưu, nhập vào ứng dụng lịch trên điện
            thoại/máy tính để tự động nhắc nhở.</li>
        </ul>

        <h3>6. Lưu trữ dữ liệu</h3>
        <p>
          Toàn bộ dữ liệu được lưu ngay trên trình duyệt của bạn (không gửi lên máy chủ nào). Nếu xóa dữ liệu
          trình duyệt, danh sách sẽ mất — nên xuất ra Excel định kỳ để sao lưu.
        </p>

        <h3>7. Cài đặt như ứng dụng (PWA)</h3>
        <p>Có thể chọn "Thêm vào màn hình chính" từ trình duyệt để dùng ứng dụng như một app trên điện thoại/máy tính.</p>
      </div>
    </div>
  `;
}

function renderDonateModal(): string {
  if (!donateOpen) return "";
  return `
    <div class="info-modal-backdrop" id="donate-backdrop">
      <div class="info-modal donate-modal" role="dialog" aria-modal="true" aria-label="Ủng hộ dự án">
        <button type="button" class="info-modal-close" id="donate-close" aria-label="Đóng">×</button>
        <h2>Ủng hộ dự án</h2>
        <p>
          Đây là dự án cá nhân, được xây dựng và duy trì miễn phí. Nếu ứng dụng hữu ích với bạn, hãy ủng hộ mình
          một chút để có thêm động lực duy trì và phát triển thêm tính năng mới. Xin chân thành cảm ơn!
        </p>
        <img class="donate-qr" src="${VIETQR_IMAGE_URL}" alt="Mã QR chuyển khoản Vietcombank" loading="lazy" />
        <p class="donate-account">Vietcombank — ${DONOR_ACCOUNT_NAME} — STK ${DONOR_ACCOUNT_NO}</p>
      </div>
    </div>
  `;
}

export function renderInfoPanels(): string {
  return renderHelpModal() + renderDonateModal();
}

export function wireInfoPanels(onChange: () => void): void {
  document.getElementById("open-help")?.addEventListener("click", () => {
    helpOpen = true;
    onChange();
  });
  document.getElementById("help-close")?.addEventListener("click", () => {
    helpOpen = false;
    onChange();
  });
  const helpBackdrop = document.getElementById("help-backdrop");
  helpBackdrop?.addEventListener("click", (e) => {
    if (e.target === helpBackdrop) {
      helpOpen = false;
      onChange();
    }
  });

  document.getElementById("open-donate")?.addEventListener("click", () => {
    donateOpen = true;
    onChange();
  });
  document.getElementById("donate-close")?.addEventListener("click", () => {
    donateOpen = false;
    onChange();
  });
  const donateBackdrop = document.getElementById("donate-backdrop");
  donateBackdrop?.addEventListener("click", (e) => {
    if (e.target === donateBackdrop) {
      donateOpen = false;
      onChange();
    }
  });
}
