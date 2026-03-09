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

### 第三步：部署到 Vercel (云端)

1.  注册并登录 [Vercel](https://vercel.com/)（直接用 GitHub 账号登录最方便）。
2.  点击 **Add New...** -> **Project**。
3.  在列表中找到你刚才创建的 `drawer` 仓库，点击 **Import**。
4.  <strong>关键步骤：设置 API Key</strong>
    *   展开 **Environment Variables** (环境变量) 区域。
    *   **Key** 输入：`SILICONFLOW_API_KEY`
    *   **Value** 输入：你的 SiliconFlow API Key (即那个 sk- 开头的长字符串)。
    *   点击 **Add**。
5.  点击 **Deploy**。

### 第四步：在手机上安装 (PWA)

1.  部署完成后，Vercel 会给你一个网址（如 `drawer-xxx.vercel.app`）。
2.  在手机浏览器（iPhone 建议使用 Safari，安卓建议使用 Chrome）中打开这个网址。
3.  **iPhone**: 点击浏览器底部的「分享」图标，选择 **「添加到主屏幕」** (Add to Home Screen)。
4.  **安卓**: 点击右上角三个点，选择 **「安装应用」** 或 「添加到主屏幕」。

---

**现在，「抽屉」就像一个原生的 App 一样躺在你的手机桌面上，且所有的靈感交互都经过加密代理，非常安全！** 🌿
