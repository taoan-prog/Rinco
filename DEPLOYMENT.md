# Rinco 网站 + 管理后台部署说明

## 文件结构

```
Rinco/
├── index.html                    # 网站首页
├── products-index.json           # 产品数据索引（自动维护）
├── images/                       # 产品图片文件夹
├── _products/                    # 产品数据文件（.md）
├── admin/
│   └── index.html                # 管理后台页面
└── functions/
    └── api/
        ├── login.js              # 登录 API
        ├── products.js           # 产品列表 API
        └── product-save.js       # 产品保存/删除 API
```

## 上传到 GitHub

把 `rinco-v4` 文件夹里**所有文件和文件夹**上传到你的 Rinco 仓库，覆盖旧文件。

## 在 Cloudflare Pages 配置环境变量

这是最关键的一步 —— Token 必须存在服务器端，不能写在代码里。

1. 登录 Cloudflare Dashboard → 左侧 **Workers & Pages** → 点击你的 **rinco** 项目
2. 进入 **Settings** → **Environment variables**
3. 添加以下 3 个变量（都选 **Production** 和 **Preview** 两个环境都启用）：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `ADMIN_PASSWORD` | `iAmrincoaDmin` | 管理员登录密码 |
| `GITHUB_TOKEN` | `github_pat_...`（你的 Token） | GitHub 访问令牌 |
| `GITHUB_REPO` | `taoan-prog/Rinco` | GitHub 仓库路径 |

**重要**：`GITHUB_TOKEN` 必须设置为 **Encrypted**（加密），点击变量旁的锁形图标。

4. 保存后，Cloudflare 会自动重新部署。

## 使用方法

1. 访问 `https://rinco.pages.dev/admin/`
2. 输入密码 `iAmrincoaDmin` 登录
3. 可以：
   - 新增产品（上传图片、填写信息）
   - 编辑现有产品
   - 删除产品
   - 控制产品是否在首页显示

所有改动会自动提交到 GitHub，Cloudflare 在 1-2 分钟内自动重新部署网站。

## 安全说明

- GitHub Token 存在 Cloudflare 环境变量里，前端代码无法访问
- 所有 API 调用都需要验证密码
- 没有密码的人看到 `/admin` 页面也无法获取任何数据
