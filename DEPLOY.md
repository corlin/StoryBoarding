# 🚀 Cloudflare 全自动部署指南 (美东节点 US East ➕ GitHub Actions)

本指南指导你完成 **Cloudflare 资源开通（美东节点）**、**GitHub Secrets 凭证绑定** 与 **全自动 CI/CD 流程测试**。

---

## 📋 架构与节点规范

- **后端 Worker**：部署于 Cloudflare Workers 全球边缘（启用 `[placement] mode = "smart"` 自动贴合美东数据中心）；
- **D1 数据库**：强制指定位于 **美东区域（`--location=enam` / Eastern North America）**；
- **R2 对象存储**：免流量费对象存储，用于直存分镜图；
- **前端 Pages**：Next.js 全静态全球 CDN 托管（Cloudflare Pages）。

---

## 🛠️ 第一步：在 Cloudflare 创建美东资源

确保本地已安装依赖，在终端执行以下指令：

```bash
cd backend

# 1. 登录 Cloudflare（首次操作需登录）
npx wrangler login

# 2. 创建美东 D1 数据库（强制指定 --location=enam）
npx wrangler d1 create storyboard_db --location=enam

# 3. 创建 R2 资产存储桶
npx wrangler r2 bucket create storyboard-assets
```

> **提示**：创建 D1 成功后，控制台会输出类似：
> `database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`
> 将该 `database_id` 填入 `backend/wrangler.toml` 中的 `database_id` 字段即可。

---

## 🔑 第二步：获取 Cloudflare API Token 与 Account ID

### 1. 获取 Account ID (账户 ID)
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com)；
2. 在浏览器 URL 或右侧面板中即可直接看到 **Account ID**（一串 32 位的字母数字组合）。

### 2. 创建最小权限 API Token
1. 访问 [Cloudflare API Tokens 页面](https://dash.cloudflare.com/profile/api-tokens)；
2. 点击 **「Create Token」**；
3. 选择 **「Create Custom Token」**（自定义 Token），配置如下权限：
   - **Account** ➔ `Cloudflare Pages` ➔ **Edit**
   - **Account** ➔ `D1` ➔ **Edit**
   - **Account** ➔ `Workers R2 Storage` ➔ **Edit**
   - **Account** ➔ `Workers Scripts` ➔ **Edit**
   - **User** ➔ `Memberships` ➔ **Read**
4. 点击 **Continue to summary** 并生成 Token，复制保存。

---

## 🔒 第三步：在 GitHub 仓库添加 Secrets

进入你的 GitHub 仓库（`https://github.com/corlin/StoryBoarding`）：
1. 点击 **Settings** ➔ **Secrets and variables** ➔ **Actions**；
2. 点击 **New repository secret**，添加以下变量：

| Secret 变量名 | 必填 | 含义 / 值 |
| :--- | :---: | :--- |
| **`CLOUDFLARE_API_TOKEN`** | **是** | 在第二步生成的 Cloudflare API Token |
| **`CLOUDFLARE_ACCOUNT_ID`** | **是** | 你的 Cloudflare 账户 ID |
| **`NEXT_PUBLIC_API_URL`** | 否 | 你的 Worker 生产域名，如 `https://storyboard-backend.xxxx.workers.dev` |

---

## ⚡ 第四步：触发自动部署

配置完成后，自动化流水线将全自动运行：

### 1. 代码推送自动触发
- 提交并推送修改到 `main` 分支时：
  - 若修改了 `backend/` ➔ 自动触发 **`deploy-backend.yml`**（自动执行美东 D1 迁移 ➕ 部署 Worker）；
  - 若修改了 `frontend/` ➔ 自动触发 **`deploy-frontend.yml`**（自动编译 Next.js ➕ 部署 Pages）。

### 2. 手动在 GitHub 页面一键触发
1. 打开 GitHub 仓库的 **Actions** 标签页；
2. 在左侧选择 **`Deploy Backend to Cloudflare Workers (US East)`** 或 **`Deploy Frontend to Cloudflare Pages`**；
3. 点击 **Run workflow** 即可随时手动触发全球部署。

---

## 🌐 访问与验证

- **后端健康检查**：访问 `https://storyboard-backend.<你的子域名>.workers.dev/api/health`
- **前端工作台**：访问 Cloudflare Pages 分配的生产域名（或自定义域名）。
