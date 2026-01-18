# Literature Finder - 学术文献检索工具

一个基于 Web 的学术文献检索和下载工具，支持多种下载源。

## 🚀 快速开始

### 方法一：直接打开（推荐）
双击 `index.html` 文件即可直接在浏览器中打开使用。

### 方法二：使用 Python 本地服务器
```bash
cd literature-finder
python3 -m http.server 8080
```
然后在浏览器中访问：http://localhost:8080

### 方法三：使用 Node.js 服务器
```bash
npx serve .
```

## ✨ 功能特点

- **多种检索方式**：支持 DOI、文献标题、作者名称搜索
- **实时数据**：使用 CrossRef API 获取最新文献数据
- **多下载源**：
  - Unpaywall（合法开放获取）
  - Sci-Hub（6个镜像站点）
  - LibGen（2个镜像站点）
- **一键复制引用**：快速复制 DOI 和引用信息
- **Google Scholar 搜索**：一键跳转搜索

## 📁 文件结构

```
literature-finder/
├── index.html      # 主页面
├── styles.css      # 样式文件
├── app.js          # 应用逻辑
└── README.md       # 说明文档
```

## 🌐 部署到网络

### GitHub Pages（免费）
1. 将文件夹上传到 GitHub 仓库
2. 进入仓库设置 → Pages
3. 选择 main 分支，点击 Save
4. 等待几分钟后访问 `https://你的用户名.github.io/仓库名`

### Netlify（免费）
1. 访问 https://app.netlify.com/drop
2. 将整个文件夹拖拽到页面中
3. 等待部署完成，获得公开链接

### Vercel（免费）
1. 安装 Vercel CLI: `npm i -g vercel`
2. 在文件夹中运行: `vercel`
3. 按提示完成部署

## ⚠️ 注意事项

- 使用 Sci-Hub 和 LibGen 下载可能需要 VPN
- 请遵守相关版权法规，仅供学术研究使用
- 部分镜像站点可能不稳定，请尝试其他链接

## 📝 更新日志

- 2026-01-18: 添加多镜像下载支持，优化界面
