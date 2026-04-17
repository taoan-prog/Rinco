# Rinco International — 官网

## 文件说明
- `index.html` — 完整网站（单页，无需构建工具）
- `_redirects` — Cloudflare Pages 路由配置

---

## 部署步骤

### 第一步：上传到 GitHub

1. 登录 [github.com](https://github.com)
2. 点击右上角 **+** → **New repository**
3. Repository name 填写：`rinco-website`
4. 选择 **Public**（Cloudflare Pages 免费版需要）
5. 点击 **Create repository**
6. 在新页面点击 **uploading an existing file**
7. 把 `index.html` 和 `_redirects` 两个文件拖进去
8. 点击 **Commit changes**

---

### 第二步：连接 Cloudflare Pages

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages** → **Pages**
3. 点击 **Connect to Git**
4. 选择 **GitHub** → 授权 → 选择 `rinco-website` 仓库
5. 配置如下：
   - **Framework preset**: `None`
   - **Build command**: （留空）
   - **Build output directory**: `/`（根目录）
6. 点击 **Save and Deploy**

部署完成后（约1分钟），Cloudflare 会给你一个免费域名：
`rinco-website.pages.dev`

---

### 绑定自定义域名（可选）

如果你有自己的域名（如 `rinco-intl.com`）：
1. 在 Cloudflare Pages 项目 → **Custom domains**
2. 点击 **Set up a custom domain**
3. 输入你的域名，按提示添加 DNS 记录即可

---

## 后续修改网站

每次修改 `index.html` 并推送到 GitHub，Cloudflare Pages 会**自动重新部署**，无需任何额外操作。
