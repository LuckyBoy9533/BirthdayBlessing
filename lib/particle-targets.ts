import type {
  AmbientStar,
  Particle,
  PrepareTargetsInput,
  PreparedScene,
  TargetPoint,
} from "@/lib/particle-types";

export async function prepareParticleTargets({
  imageSource,
  text,
  viewportWidth,
  viewportHeight,
}: PrepareTargetsInput): Promise<PreparedScene> {
  const safeText = text.trim();

  if (!safeText) {
    throw new Error("祝福语不能为空。");
  }

  const portraitLayout = getPortraitLayout(
    viewportWidth,
    viewportHeight,
    imageSource.naturalWidth || imageSource.width,
    imageSource.naturalHeight || imageSource.height,
  );

  const portraitCanvas = createCanvas(portraitLayout.width, portraitLayout.height);
  const portraitContext = portraitCanvas.getContext("2d");

  if (!portraitContext) {
    throw new Error("无法创建离屏画布来处理图片。");
  }

  portraitContext.clearRect(0, 0, portraitLayout.width, portraitLayout.height);
  portraitContext.drawImage(
    imageSource,
    0,
    0,
    portraitLayout.width,
    portraitLayout.height,
  );

  let portraitImageData = portraitContext.getImageData(
    0,
    0,
    portraitLayout.width,
    portraitLayout.height,
  );

  const hasUsefulAlpha = detectUsefulTransparency(portraitImageData);

  if (!hasUsefulAlpha) {
    // 全图 WIDER Alpha blending 融合
    // 移除任何圆形中心遮罩。覆盖整个 JPG 主体，仅在极边缘处柔和淡出
    const cx = portraitLayout.width / 2;
    const cy = portraitLayout.height / 2;

    for (let y = 0; y < portraitLayout.height; y++) {
      for (let x = 0; x < portraitLayout.width; x++) {
        const dx = Math.abs(x - cx) / cx; // 0 to 1
        const dy = Math.abs(y - cy) / cy; // 0 to 1

        // 核心区域 (98%) 完全保留 100% 不透明，确保贴边的人物头部、机甲绝不被裁切
        // 仅仅在最外侧 2% 进行极微小的平滑过渡，消除硬直角边缘
        const fadeX = dx < 0.98 ? 1.0 : Math.max(0, 1.0 - (dx - 0.98) / 0.02);
        const fadeY = dy < 0.98 ? 1.0 : Math.max(0, 1.0 - (dy - 0.98) / 0.02);
        
        const alphaMask = fadeX * fadeY;

        const dataIndex = (y * portraitLayout.width + x) * 4;
        portraitImageData.data[dataIndex + 3] = Math.floor(255 * alphaMask);
      }
    }
  }

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  // 极大提升性能预算，以物理级数量碾压，直接实现类似 1080p 的高清细腻画质
  // 桌面端提升至 40000 粒子，移动端 18000 粒子，并且匹配屏幕 DPR
  const pointBudget = Math.floor((viewportWidth < 768 ? 18000 : 40000) * (dpr > 1 ? 1.2 : 1));
  const textStep = viewportWidth < 768 ? 2 : 1.5;

  const textTargets = sampleTextTargets({
    text: safeText,
    viewportWidth,
    viewportHeight,
    imageBottom: portraitLayout.y + portraitLayout.height,
    step: textStep,
  });

  const imageBudget = Math.max(3000, pointBudget - textTargets.length);

  const imageTargets = sampleImageTargets(
    portraitImageData,
    portraitLayout.x,
    portraitLayout.y,
    imageBudget,
  );

  const targets = [...imageTargets, ...textTargets];

  if (targets.length === 0) {
    throw new Error("没有生成可用的目标点，请尝试缩短文字或更换图片。");
  }

  return {
    targets,
    viewportWidth,
    viewportHeight,
  };
}

export function createParticlesFromTargets(
  targets: TargetPoint[],
  boundsWidth: number,
  boundsHeight: number,
) {
  return targets.map<Particle>((target) => ({
    x: Math.random() * boundsWidth,
    y: Math.random() * boundsHeight,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    targetX: target.x,
    targetY: target.y,
    drift: Math.random() * Math.PI * 2,
    twinkle: Math.random() * Math.PI * 2,
    sparkle: Math.random(),
    ease: target.kind === "text" ? 0.1 : 0.072,
    alpha: 0.24 + Math.random() * 0.12,
    targetAlpha: target.kind === "text" ? 0.96 : 0.9,
    size: target.kind === "text" ? 1.8 : 1.55,
    r: target.r,
    g: target.g,
    b: target.b,
    kind: target.kind,
    boundsWidth,
    boundsHeight,
  }));
}

export function createAmbientStars(width: number, height: number) {
  const count = width < 768 ? 80 : 140;

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.025,
    vy: (Math.random() - 0.5) * 0.025,
    size: 0.8 + Math.random() * 1.6,
    alpha: 0.24 + Math.random() * 0.36,
    phase: Math.random() * Math.PI * 2,
    r: 227 + Math.floor(Math.random() * 24),
    g: 210 + Math.floor(Math.random() * 26),
    b: 176 + Math.floor(Math.random() * 48),
  })) satisfies AmbientStar[];
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

function getPortraitLayout(
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
) {
  const mobile = viewportWidth < 768;
  // 支持超大覆盖面积，同时为顶部 UI 和底部文字留出呼吸空间
  const maxWidth = mobile ? viewportWidth * 0.95 : Math.min(viewportWidth * 0.9, 1200);
  const maxHeight = mobile ? viewportHeight * 0.55 : viewportHeight * 0.6;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);

  const width = Math.max(140, Math.round(imageWidth * scale));
  const height = Math.max(180, Math.round(imageHeight * scale));
  const x = Math.round((viewportWidth - width) / 2);

  // 【关键修复】：大幅增加顶部安全边距 (12%~14%)
  // 确保画面主体（头顶）被彻底推到系统顶部操作导航栏（带有保存/下载按钮的深色栏）的下方，绝不发生重叠遮挡。
  const safeMarginTop = Math.round(viewportHeight * (mobile ? 0.12 : 0.14));
  const availableHeight = viewportHeight * 0.8; 
  const y = Math.max(safeMarginTop, Math.round((availableHeight - height) / 2));

  return { x, y, width, height };
}

function detectUsefulTransparency(imageData: ImageData) {
  const { data, width, height } = imageData;
  const stride = Math.max(1, Math.floor(Math.min(width, height) / 120));
  let sampled = 0;
  let transparent = 0;
  let opaque = 0;

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const alpha = data[(y * width + x) * 4 + 3];
      sampled += 1;

      if (alpha < 245) {
        transparent += 1;
      }

      if (alpha > 128) {
        opaque += 1;
      }
    }
  }

  return transparent / Math.max(sampled, 1) > 0.015 && opaque / Math.max(sampled, 1) > 0.1;
}

function sampleImageTargets(
  portraitImageData: ImageData,
  offsetX: number,
  offsetY: number,
  targetCount: number,
) {
  const targets: TargetPoint[] = [];
  const { data, width, height } = portraitImageData;

  let validPixels = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) validPixels++;
  }

  if (validPixels === 0) return targets;

  // 数据驱动动态步长：准确计算需要的网格行列数，完美卡在性能预算上
  const validRatio = validPixels / (width * height);
  const adjustedTargetCount = targetCount / validRatio;
  const ratio = width / height;

  const stepsX = Math.max(2, Math.floor(Math.sqrt(adjustedTargetCount * ratio)));
  const stepsY = Math.max(2, Math.floor(Math.sqrt(adjustedTargetCount / ratio)));

  // 1080p高清均匀网格：完全移除导致十字光斑的非均匀映射，
  // 依靠庞大的点数总预算，在整个平面上铺满细腻致密的点阵。
  for (let iy = 0; iy < stepsY; iy++) {
    const fy = (iy / (stepsY - 1)) * (height - 1);
    const py = Math.min(height - 1, Math.max(0, Math.round(fy)));

    for (let ix = 0; ix < stepsX; ix++) {
      const fx = (ix / (stepsX - 1)) * (width - 1);
      const px = Math.min(width - 1, Math.max(0, Math.round(fx)));

      const dataIndex = (py * width + px) * 4;
      const alpha = data[dataIndex + 3];

      if (alpha > 10) {
        targets.push({
          x: offsetX + fx, // 浮点数坐标保证亚像素清晰度
          y: offsetY + fy,
          r: data[dataIndex],
          g: data[dataIndex + 1],
          b: data[dataIndex + 2],
          a: alpha,
          kind: "image",
        });
      }
    }
  }

  return targets;
}

function sampleTextTargets({
  text,
  viewportWidth,
  viewportHeight,
  imageBottom,
  step,
}: {
  text: string;
  viewportWidth: number;
  viewportHeight: number;
  imageBottom: number;
  step: number;
}) {
  const canvas = createCanvas(viewportWidth, viewportHeight);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建文字采样画布。");
  }

  const maxFontSize = viewportWidth < 768 ? 44 : 72;
  const minFontSize = viewportWidth < 768 ? 24 : 32;
  const maxTextWidth = Math.min(viewportWidth * 0.85, 920);
  const fontFamily =
    '"STXingkai", "KaiTi", "STKaiti", "DFKai-SB", "Georgia", serif';

  let fontSize = maxFontSize;
  let lines = [text];

  while (fontSize >= minFontSize) {
    context.font = `900 ${fontSize}px ${fontFamily}`;
    lines = wrapText(context, text, maxTextWidth);

    if (lines.length <= 3) {
      break;
    }

    fontSize -= 4;
  }

  const lineHeight = fontSize * 1.18;
  const totalHeight = lines.length * lineHeight;
  // 独立文字层，保证绝对在下方且间距清晰
  const gap = viewportHeight * 0.04;
  // 严格限制：文字的起始位置绝对不能高于图片底部 + 间隙！宁可偏下也绝不能重叠遮挡
  const top = Math.max(imageBottom + gap, viewportHeight * 0.7);

  context.clearRect(0, 0, viewportWidth, viewportHeight);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `900 ${fontSize}px ${fontFamily}`;
  context.fillStyle = "rgba(255, 215, 0, 1)";

  let maxLineWidth = 0;

  lines.forEach((line, index) => {
    const y = top + index * lineHeight + lineHeight / 2;
    context.fillText(line, viewportWidth / 2, y);
    maxLineWidth = Math.max(maxLineWidth, context.measureText(line).width);
  });

  const padding = Math.ceil(step * 2);
  const bounds = {
    left: Math.max(0, Math.floor((viewportWidth - maxLineWidth) / 2) - padding),
    right: Math.min(
      viewportWidth,
      Math.ceil((viewportWidth + maxLineWidth) / 2) + padding,
    ),
    top: Math.max(0, Math.floor(top - padding)),
    bottom: Math.min(viewportHeight, Math.ceil(top + totalHeight + padding)),
  };

  const imageData = context.getImageData(
    bounds.left,
    bounds.top,
    bounds.right - bounds.left,
    bounds.bottom - bounds.top,
  );

  const targets: TargetPoint[] = [];

  for (let y = 0; y < imageData.height; y += step) {
    for (let x = 0; x < imageData.width; x += step) {
      const px = Math.floor(x);
      const py = Math.floor(y);
      const dataIndex = (py * imageData.width + px) * 4;
      const alpha = imageData.data[dataIndex + 3];

      if (alpha <= 10) {
        continue;
      }

      const warmVariance = ((px + py) % 24) / 24;

      targets.push({
        x: bounds.left + px,
        y: bounds.top + py,
        r: 245 + Math.floor(warmVariance * 10),
        g: 210 + Math.floor(warmVariance * 25),
        b: 100 + Math.floor(warmVariance * 30),
        a: alpha,
        kind: "text",
      });
    }
  }

  return targets;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const tokens = Array.from(text);
  const lines: string[] = [];
  let currentLine = "";

  for (const token of tokens) {
    if (token === "\n") {
      lines.push(currentLine.trim());
      currentLine = "";
      continue;
    }

    const candidate = currentLine + token;

    if (currentLine && context.measureText(candidate).width > maxWidth) {
      lines.push(currentLine.trim());
      currentLine = token;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines.filter(Boolean);
}
