# 🎉 Birthday Particle Hologram | 专属生日粒子全息特效

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?logo=react)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css)

[English](#english) | [中文说明](#中文说明)

---

<h2 id="english">🇺🇸 English</h2>

### 📖 Introduction
**Birthday Particle Hologram** is a high-definition, interactive particle animation generator built with Next.js and HTML5 Canvas. It transforms any uploaded photo and text into a stunning, responsive, and highly detailed holographic particle projection. 

Initially designed as a unique digital birthday gift, it features a custom data-driven sampling algorithm to handle complex images (like intricate metallic textures or detailed subjects) without relying on heavy frontend AI background-removal models.

### ✨ Key Features
* **Data-Driven Dynamic Step Sampling:** Automatically calculates the optimal sampling step based on the device's screen resolution, ensuring a dense 1080p visual experience while maintaining peak rendering performance.
* **Holographic Radial Alpha Blending:** Smoothly fades the edges of non-transparent images into the dark space background, eliminating hard edges and creating a realistic hologram effect.
* **Native RGB Color Preservation:** Inherits the exact pixel colors from the original image, ensuring facial details and complex object textures remain sharp and recognizable.
* **Interactive Physics:** Particles dynamically react to cursor movements with a spring-physics repelling effect, seamlessly reforming the image once the cursor moves away.

### 🚀 Getting Started

**Prerequisites:**
* Node.js 18.x or later
* npm, yarn, or pnpm

**Installation:**
1. Clone the repository:
   ```bash
   git clone https://github.com/LuckyBoy9533/BirthdayBlessing.git
   cd BirthdayBlessing
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### 💡 Usage
1. Upload an image (a subject with a dark/clean background or a transparent PNG works best).
2. Enter your custom text or blessing.
3. Click generate and watch the particles converge into a high-definition hologram.

### 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<h2 id="中文说明">🇨🇳 中文说明</h2>

### 📖 项目简介
**专属生日粒子全息特效 (Birthday Particle Hologram)** 是一个基于 Next.js 和 HTML5 Canvas 构建的高清交互式粒子动画生成器。它可以将您上传的照片和文字瞬间转化为令人惊叹的、充满科技感的粒子全息投影。

本项目最初是作为一份硬核且浪漫的数字生日礼物而设计的。它内置了深度定制的数据驱动采样算法，无需依赖臃肿的前端 AI 抠图模型，即可完美处理复杂背景和高细节主体，在纯前端实现电影级的视觉表现。

### ✨ 核心特性
* **数据驱动动态步长采样 (Dynamic Step Sampling)：** 算法会根据设备屏幕分辨率和性能预算动态计算采样率。在保证极高流畅度的同时，在画面中心生成致密的高清点阵，完美还原人物面部细节与复杂纹理（支持 1080p 级视觉效果）。
* **全息径向渐变融合 (Radial Alpha Blending)：** 针对普通 JPG 照片，采用创新的径向透明度遮罩技术，使画面边缘极其柔和地淡入星空背景，彻底消除生硬的边界，营造真实的全息投影质感。
* **原生色彩保留 (Color Preservation)：** 粒子直接继承原图像素的 RGB 颜色，并在此基础上叠加微光效果，确保复杂的色彩细节得以完整保留。
* **交互式物理引擎 (Interactive Physics)：** 引入带有弹簧物理参数的排斥算法。鼠标或手指滑动时，粒子会如同受引力干扰般散开，随后平滑就位，交互体验极佳。

### 🚀 快速开始

**环境要求：**
* Node.js 18.x 或更高版本
* npm, yarn 或 pnpm

**安装与运行：**

1. 克隆项目到本地：
   ```bash
   git clone https://github.com/LuckyBoy9533/BirthdayBlessing.git
   cd BirthdayBlessing
   ```

2. 安装依赖包：
   ```bash
   npm install
   ```

3. 启动本地开发环境：
   ```bash
   npm run dev
   ```

4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可预览。

### 💡 使用指南
1. 在控制面板中上传一张主角的照片（推荐使用透明背景的 PNG，或主体清晰的照片）。
2. 在文本框中输入您的专属祝福语。
3. 点击“生成特效”按钮，见证星河汇聚的奇迹。

### 📜 开源协议
本项目遵循 MIT 开源协议 - 详情请查看 [LICENSE](LICENSE) 文件。