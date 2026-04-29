# HoloParticle Canvas (Birthday Blessing)

HoloParticle Canvas is an enterprise-grade, high-performance HTML5 Canvas particle engine designed to create stunning holographic, interactive photo projections and typography. Originally created as an interactive birthday blessing application, it is capable of rendering up to 50,000+ individual particles dynamically extracted from uploaded JPG/PNG images at a smooth 60 FPS.

## ✨ Features

- **High-Definition Particle Engine**: Utilizes sub-pixel precision rendering to avoid moiré patterns and visual artifacts, delivering ultra-dense "1080p-like" particle aesthetics.
- **Dynamic DPR Budgeting**: Automatically scales the maximum particle budget based on device pixel ratio (DPR), unleashing maximum resolution on Retina displays.
- **Holographic Alpha Fade**: Integrates a seamless boxed alpha mask algorithm to smoothly fade out edges, maintaining image integrity while embedding subjects into deep-space backgrounds.
- **Native RGB Extraction**: Reads native pixel color data at sub-pixel coordinates to illuminate the particles with realistic colors.
- **Real-time Assembly & Interactive Physics**: Particles assemble through simulated drift, twinkle, and magnetic attraction mechanics.
- **Export to PNG/GIF**: Built-in functionality to record and download the animation loop as a high-quality GIF or save the final state as a PNG.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0 or later
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/HoloParticle-Canvas.git
   cd HoloParticle-Canvas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🛠 Tech Stack
- **Next.js**: React Framework
- **TypeScript**: Strict typing for particle engine math
- **Tailwind CSS**: UI styling
- **Canvas 2D API**: Core rendering engine
- **gifenc**: Client-side GIF encoding

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
