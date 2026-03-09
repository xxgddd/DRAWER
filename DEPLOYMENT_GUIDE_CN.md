# 抽屉 Drawer：部署与安全性手册 (Deployment & Security Guide)

为了让你能安全、放心地将「抽屉」部署到云端并在手机上使用，我为你整理了这份完整的操作指南。

---

## 🔒 安全性审计 (Security Audit)

**问：这段代码有任何危险吗？会广播我的私人信息或 API 吗？**

**答：绝对不会。以下是代码的运行逻辑，请放心：**

1.  **数据仅在本地**：你的所有「点子」和「灵感」都存储在浏览器的 `localStorage` 中。这意味着数据**只存在于你的手机或电脑上**，不会上传到任何服务器数据库。
2.  **API Key 保护**：
    *   在之前的单文件版本中，API Key 是明文写在代码里的，如果在公网访问，别人可以通过「查看源代码」看到它。
    *   **现在的方案**：我创建了 `api/chat.js`（代理服务器）。当你部署在 Vercel 后，API Key 会作为「环境变量」存在服务器端。**前端页面（用户的浏览器）无法看到这个 Key**，它只在后台安全地与 SiliconFlow 通讯。
3.  **无第三方监控**：代码中除了必要的 D3.js（绘图）和 Confetti（纸屑特效）库，没有任何广告、统计或行为追踪代码。

---

## 🚀 完整部署步骤

### 第一步：准备代码

1.  **打开终端** (Terminal)，确认你在项目文件夹 `d:\BLINK\drawer`。
2.  **运行以下命令**，将所有新文件加入 Git 记录：
    ```powershell
    git add .
    git commit -m "Initial PWA version with secure proxy"
    ```

### 第二步：创建 GitHub 仓库

1.  登录 [GitHub](https://github.com/)。
2.  点击右上角的 **+** -> **New repository**。
3.  **Repository name** 输入 `drawer`（或者你喜欢的名字）。
4.  选择 **Private**（私有库，这样只有你能看到代码，更安全）。
5.  点击 **Create repository**。
6.  在接下来的页面中，找到 "…or push an existing repository from the command line" 下的代码，复制那两行，例如：
    ```powershell
    git remote add origin https://github.com/你的用户名/drawer.git
    git branch -M main
    git push -u origin main
    ```
7.  回到终端运行这些命令。现在你的代码已经安全地传到了 GitHub 上。

### 第三步：云端部署 (二选一)

#### 选项 A：部署到 Vercel (首选)
1.  注册并登录 [Vercel](https://vercel.com/)（直接用 GitHub 登录最方便）。
2.  点击 **Add New...** -> **Project**。
3.  导入你创建的 `drawer` 仓库。
4.  **关键：设置环境变量**
    *   展开 **Environment Variables**。
    *   **Key**: `SILICONFLOW_API_KEY` | **Value**: 你的密钥。
5.  点击 **Deploy**。

#### 选项 B：部署到 Zeabur (备选，若 Vercel 访问困难)
Zeabur 对中文环境友好，且配置极其简单。
1.  登录 [Zeabur](https://zeabur.com/)。
2.  点击 **"创建项目"** -> **"GitHub"**，导入你的仓库。
3.  在服务详情页，点击 **"变量" (Variables)**。
4.  添加 `SILICONFLOW_API_KEY`并填入密钥。
5.  在 **"域名" (Domains)** 选项卡点击生成一个免费域名即可。

#### 选项 C：部署到 Netlify
1.  登录 [Netlify](https://www.netlify.com/)。
2.  点击 **"Add new site"** -> **"Import an existing project"**。
3.  配置页面找到 **"Environment variables"**，添加 `SILICONFLOW_API_KEY`。
4.  点击 **"Deploy"**。

### 第四步：在手机上安装 (PWA)

1.  使用手机浏览器打开你生成的域名（如 `drawer.zeabur.app` 或 `xxx.vercel.app`）。
2.  **iPhone**: 点击「分享」 -> **「添加到主屏幕」**。
3.  **安卓**: 点击菜单 -> **「安装应用」**。

---

**现在，「抽屉」就像一个原生的 App 一样躺在你的手机桌面上。无论是在地铁还是咖啡厅，想记点子了直接点开。对话内容实时通过云端加密转发，而你的点子库永远安全地留在你本地！** 🌿
