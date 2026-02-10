# Hướng dẫn Setup GitLab Activity cho GitHub Profile

Hướng dẫn chi tiết để hiển thị activity từ **2 GitLab instances** (gitlab.com + self-hosted) trên GitHub profile.

## 📋 Bước 1: Thiết lập Secrets

Vào **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Cho GitLab.com (Bắt buộc)

| Secret Name | Value | Ghi chú |
|------------|-------|---------|
| `GITLAB_USERNAME` | username trên gitlab.com | **Bắt buộc** |
| `GITLAB_TOKEN` | personal access token | Tùy chọn, tăng rate limit |

### Cho Self-hosted GitLab (git.lix.to)

| Secret Name | Value | Ghi chú |
|------------|-------|---------|
| `GITLAB2_URL` | `https://git.lix.to` | **Bắt buộc** nếu dùng instance thứ 2 |
| `GITLAB2_USERNAME` | username trên git.lix.to | **Bắt buộc** nếu dùng instance thứ 2 |
| `GITLAB2_TOKEN` | personal access token | Khuyến nghị |

### Cách tạo GitLab Personal Access Token

#### Cho GitLab.com:
1. Vào https://gitlab.com/-/profile/personal_access_tokens
2. Click **Add new token**
3. Điền:
   - **Token name**: `github-profile-readonly`
   - **Expiration date**: 1 năm hoặc không giới hạn
   - **Scopes**: ✅ Chỉ chọn `read_api`
4. Click **Create personal access token**
5. **Copy token** (chỉ hiện 1 lần!)
6. Paste vào GitHub Secrets

#### Cho Self-hosted GitLab (git.lix.to):
1. Vào https://git.lix.to/-/profile/personal_access_tokens
2. Làm tương tự như trên
3. Paste vào GitHub Secrets với tên `GITLAB2_TOKEN`

---

## 🚀 Bước 2: Chạy lần đầu

### Cách 1: Chạy thủ công (Khuyến nghị)
1. Vào tab **Actions**
2. Click workflow **"Update GitLab Activity"**
3. Click **"Run workflow"** → chọn branch `main` → **"Run workflow"**
4. Đợi ~1 phút
5. Kiểm tra README.md đã được cập nhật

### Cách 2: Tự động hàng ngày
- Workflow sẽ tự chạy **mỗi ngày lúc 9:00 UTC** (16:00 giờ Việt Nam)
- Không cần làm gì thêm

---

## ⚙️ Bước 3: Tùy chỉnh (Optional)

### Thay đổi số lượng events hiển thị

Sửa file `.github/workflows/update-gitlab-activity.yml`:

```yaml
env:
  MAX_EVENTS: '20'  # Thay 15 thành số bạn muốn
```

### Thay đổi thời gian chạy tự động

Sửa cron schedule:

```yaml
schedule:
  - cron: '0 2 * * *'  # 2:00 UTC = 9:00 VN
```

Dùng https://crontab.guru để tạo cron expression.

### Bỏ instance thứ 2

Nếu chỉ muốn dùng gitlab.com, **không cần** set:
- `GITLAB2_URL`
- `GITLAB2_USERNAME`
- `GITLAB2_TOKEN`

Script sẽ tự động bỏ qua instance thứ 2.

---

## 🔧 Troubleshooting

### ❌ "User not found"
- Kiểm tra lại username trong Secrets (phân biệt hoa thường)
- Đảm bảo user tồn tại trên GitLab instance đó

### ❌ "403 Forbidden" hoặc "429 Too Many Requests"
- Thêm token vào Secrets để tăng rate limit
- Token cần scope `read_api`

### ❌ README không cập nhật
- Vào **Actions** → xem logs của workflow
- Kiểm tra markers `<!-- START_GITLAB_ACTIVITY -->` có trong README
- Đảm bảo workflow có quyền write (`permissions: contents: write`)

### ❌ "HTTP 502/503" từ self-hosted GitLab
- Kiểm tra `GITLAB2_URL` đúng format (có https://)
- Kiểm tra self-hosted GitLab có online không
- Kiểm tra firewall/network có block GitHub Actions IP không

### ❌ Không có activity nào hiển thị
- Kiểm tra user có activity **công khai** không
- Nếu activity là private, cần token với scope phù hợp
- Kiểm tra logs để xem lỗi cụ thể

---

## 📚 Thông tin thêm

### GitLab API được sử dụng
- `GET /users?username={username}` - Tìm user ID
- `GET /users/{id}/events` - Lấy user events
- `GET /projects/{id}` - Lấy project details

### Workflow schedule
- Default: Mỗi ngày 9:00 UTC
- Có thể chạy manual bất cứ lúc nào
- Commit message có `[skip ci]` để tránh trigger vô hạn

### Rate limits
- **Không có token**: 300 requests/hour/IP
- **Có token**: 5000 requests/hour/token

---

## 💬 Support

Có vấn đề? 
- Mở issue trong repo này
- Check logs tại **Actions** tab
- Đảm bảo đã làm đúng các bước trong hướng dẫn
