# Website Dat Kafe

Website bán cà phê: trang giới thiệu sản phẩm + giỏ hàng + thanh toán online qua VNPay.

## Cấu trúc dự án

```
datkafe-web/
├── public/          -> Frontend (HTML/CSS/JS) - trang khách hàng nhìn thấy
│   ├── index.html        Trang chủ
│   ├── products.html      Danh sách sản phẩm
│   ├── product-detail.html Chi tiết sản phẩm
│   ├── about.html         Giới thiệu / câu chuyện thương hiệu
│   ├── cart.html          Giỏ hàng
│   ├── checkout.html      Form đặt hàng + chuyển sang VNPay
│   └── order-result.html  Trang kết quả sau khi thanh toán
├── data/products.json     Danh sách sản phẩm (SỬA Ở ĐÂY để đổi sản phẩm/giá)
├── data/orders.json       Đơn hàng được lưu tạm vào đây (file JSON, xem lưu ý bên dưới)
├── routes/                API backend (Express)
├── utils/orderStore.js    Lưu & đọc đơn hàng
├── server.js              Điểm khởi động server
└── .env.example            Mẫu cấu hình — copy thành .env và điền thông tin thật
```

## 1. Chạy thử trên máy của bạn

Cần cài sẵn [Node.js](https://nodejs.org) (bản 18 trở lên).

```bash
cd datkafe-web
npm install
cp .env.example .env
npm start
```

Mở trình duyệt: http://localhost:3000

> Lưu ý: môi trường mình dùng để soạn website này bị chặn truy cập kho npm nên
> mình KHÔNG chạy được `npm install` để test trực tiếp. Mình đã kiểm tra kỹ
> cú pháp từng file và test toàn bộ giao diện + API bằng một server giả lập —
> nhưng bạn nên tự chạy `npm install && npm start` trên máy/hosting thật và
> báo lại nếu gặp lỗi để mình sửa ngay.

## 2. Để nút "Thanh toán qua VNPay" hoạt động thật

Bạn cần đăng ký tài khoản merchant với VNPay — website tự làm không thể tự
sinh ra tài khoản thanh toán, đây là bước bạn phải làm trực tiếp với VNPay:

1. **Đăng ký sandbox (miễn phí, để test trước):** vào
   https://sandbox.vnpayment.vn/apis/ → đăng ký tài khoản thử nghiệm, VNPay sẽ
   cấp cho bạn `vnp_TmnCode` và `vnp_HashSecret`.
2. **Đăng ký tài khoản thật (production):** liên hệ VNPay qua https://vnpay.vn
   để ký hợp đồng merchant. Cần giấy phép kinh doanh / hộ kinh doanh của quán.
   VNPay sẽ cấp `vnp_TmnCode` và `vnp_HashSecret` production riêng.
3. Mở file `.env`, điền:
   ```
   VNP_TMNCODE=mã_do_vnpay_cấp
   VNP_HASHSECRET=chuỗi_bí_mật_do_vnpay_cấp
   VNP_TESTMODE=true   # đổi thành false khi dùng tài khoản production thật
   BASE_URL=https://domain-that-cua-ban.com
   ```
4. Trong trang quản trị merchant của VNPay, khai báo **IPN URL** là:
   `https://domain-that-cua-ban.com/api/vnpay-ipn`
   (đây là bước bắt buộc để VNPay báo cho website biết khách đã thanh toán
   thành công — nếu thiếu bước này, đơn hàng sẽ không được xác nhận tự động).

Trước khi có tài khoản VNPay, trang checkout vẫn chạy nhưng sẽ báo lỗi rõ ràng
"chưa cấu hình VNP_TMNCODE" thay vì bị treo hay lỗi khó hiểu.

## 3. Đưa web lên internet (hosting)

Website này có backend (Node.js/Express) nên **không thể** deploy lên hosting
tĩnh kiểu Netlify/GitHub Pages — cần nơi chạy được server Node.js. Vài lựa chọn
dễ dùng, có gói miễn phí/giá rẻ:

- **Render.com** — kết nối repo GitHub, chọn "Web Service", build command
  `npm install`, start command `npm start`. Có gói free.
- **Railway.app** — tương tự Render, thao tác kéo-thả đơn giản.
- **VPS riêng** (DigitalOcean, Vultr...) — cần biết cơ bản về SSH + PM2 để giữ
  server chạy liên tục.

Sau khi có domain + hosting, đăng ký domain đó (ví dụ tại Mắt Bão, iNET, hoặc
Namecheap), trỏ DNS về hosting, rồi cập nhật `BASE_URL` trong `.env` và IPN URL
trong trang quản trị VNPay.

## 4. Thay nội dung/ảnh thật

- **Sản phẩm:** sửa file `data/products.json` — mỗi sản phẩm có tên, giá, mô
  tả, danh mục. Giá tính bằng VNĐ (không nhân 100, hệ thống tự xử lý).
- **Ảnh sản phẩm:** hiện tại web đang dùng khối màu + icon thay cho ảnh thật
  (vì mình chưa có ảnh sản phẩm của bạn). Để thêm ảnh thật: bỏ ảnh vào
  `public/img/`, thêm trường `"image": "/img/ten-anh.jpg"` vào từng sản phẩm
  trong `products.json`, rồi thay khối `<div class="product-thumb">` bằng
  `<img>` trong các file `.html` tương ứng — báo mình để mình làm giúp nếu cần.
- **Thông tin liên hệ:** sửa số điện thoại/địa chỉ trong phần footer của từng
  trang HTML (hiện đang để dạng "cập nhật...").
- **Logo/màu sắc:** màu chủ đạo (nâu/be) khai báo trong `public/css/style.css`,
  phần `:root { --brown-dark: ...; --gold: ...; }`.

## 5. Lưu ý về lưu trữ đơn hàng

Đơn hàng hiện lưu vào file `data/orders.json` — đơn giản, dễ xem, phù hợp lúc
mới bắt đầu bán. Khi lượng đơn hàng tăng lên, nên chuyển sang cơ sở dữ liệu
thật (ví dụ PostgreSQL, MongoDB) để tránh mất dữ liệu hoặc xung đột khi có
nhiều đơn cùng lúc — báo mình khi cần nâng cấp phần này.
