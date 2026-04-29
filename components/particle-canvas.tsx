"use client";

import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import {
  createAmbientStars,
  createParticlesFromTargets,
  prepareParticleTargets,
} from "@/lib/particle-targets";
import type {
  AmbientStar,
  Particle,
  ParticleCanvasController,
  ParticleCanvasProps,
  PreparedScene,
} from "@/lib/particle-types";

const ASSEMBLY_LEAD_IN_MS = 900;
const ASSEMBLY_DURATION_MS = 5200;
const FINAL_HOLD_MS = 1400;
const GIF_FRAME_RATE = 12;
const EXPORT_MAX_EDGE = 720;
const GIF_MAX_COLORS = 160;

type TimelineState = {
  activeSince: number | null;
  lastTickAt: number | null;
  settled: boolean;
};

export default function ParticleCanvas({
  imageSource,
  text,
  active,
  replayToken = 0,
  controllerRef,
  onReady,
  onError,
  onSettled,
}: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const activeRef = useRef(active);
  const particlesRef = useRef<Particle[]>([]);
  const ambientStarsRef = useRef<AmbientStar[]>([]);
  const particleTemplateRef = useRef<Particle[]>([]);
  const ambientTemplateRef = useRef<AmbientStar[]>([]);
  const sceneRef = useRef<PreparedScene | null>(null);
  const timelineRef = useRef<TimelineState>({
    activeSince: null,
    lastTickAt: null,
    settled: false,
  });

  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [sceneVersion, setSceneVersion] = useState(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  useEffect(() => {
    if (!imageSource || !text.trim() || viewport.width === 0 || viewport.height === 0) {
      return;
    }

    let cancelled = false;

    const prepareScene = async () => {
      try {
        const scene = await prepareParticleTargets({
          imageSource,
          text,
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
        });

        if (cancelled) {
          return;
        }

        const particleTemplate = createParticlesFromTargets(
          scene.targets,
          scene.viewportWidth,
          scene.viewportHeight,
        );
        const ambientTemplate = createAmbientStars(
          scene.viewportWidth,
          scene.viewportHeight,
        );

        sceneRef.current = scene;
        particleTemplateRef.current = particleTemplate;
        ambientTemplateRef.current = ambientTemplate;
        particlesRef.current = cloneParticles(particleTemplate);
        ambientStarsRef.current = cloneAmbientStars(ambientTemplate);
        timelineRef.current = {
          activeSince: null,
          lastTickAt: null,
          settled: false,
        };
        setSceneVersion((currentVersion) => currentVersion + 1);

        onReady?.();
      } catch (preparationError) {
        if (cancelled) {
          return;
        }

        onError?.(
          preparationError instanceof Error
            ? preparationError.message
            : "粒子轮廓生成失败，请尝试更换图片。",
        );
      }
    };

    prepareScene();

    return () => {
      cancelled = true;
    };
  }, [imageSource, onError, onReady, text, viewport.height, viewport.width]);

  useEffect(() => {
    if (!sceneRef.current || !active) {
      return;
    }

    restartSimulation(
      particleTemplateRef,
      ambientTemplateRef,
      particlesRef,
      ambientStarsRef,
      timelineRef,
    );
  }, [active, replayToken, sceneVersion]);

  useEffect(() => {
    if (!controllerRef) {
      return;
    }

    controllerRef.current = {
      replay: () => {
        restartSimulation(
          particleTemplateRef,
          ambientTemplateRef,
          particlesRef,
          ambientStarsRef,
          timelineRef,
        );
      },
      downloadPoster: async (fileBaseName) => {
        await exportPoster(
          sceneRef.current,
          particleTemplateRef.current,
          ambientTemplateRef.current,
          fileBaseName,
        );
      },
      downloadGif: async (fileBaseName) => {
        await exportGif(
          sceneRef.current,
          particleTemplateRef.current,
          ambientTemplateRef.current,
          fileBaseName,
        );
      },
    } satisfies ParticleCanvasController;

    return () => {
      controllerRef.current = null;
    };
  }, [controllerRef, sceneVersion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;

    if (!canvas || !scene) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      onError?.("当前浏览器不支持 Canvas 2D 上下文。");
      return;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(scene.viewportWidth * pixelRatio));
    canvas.height = Math.max(1, Math.floor(scene.viewportHeight * pixelRatio));
    canvas.style.width = `${scene.viewportWidth}px`;
    canvas.style.height = `${scene.viewportHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.imageSmoothingEnabled = true;

    const render = (time: number) => {
      const timeline = timelineRef.current;
      const lastTickAt = timeline.lastTickAt ?? time;
      const deltaMs = Math.min(Math.max(time - lastTickAt, 0), 64);
      timeline.lastTickAt = time;

      renderParticleScene({
        context,
        viewportWidth: scene.viewportWidth,
        viewportHeight: scene.viewportHeight,
        particles: particlesRef.current,
        stars: ambientStarsRef.current,
        now: time,
        deltaMs,
        active: activeRef.current,
        activeSince: timeline.activeSince,
        includeBackdrop: false,
      });

      if (
        activeRef.current &&
        timeline.activeSince !== null &&
        !timeline.settled &&
        getAssemblyProgress(time - timeline.activeSince) >= 1
      ) {
        timeline.settled = true;
        onSettled?.();
      }

      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    animationFrameRef.current = window.requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [onError, onSettled, sceneVersion]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

function restartSimulation(
  particleTemplateRef: MutableRefObject<Particle[]>,
  ambientTemplateRef: MutableRefObject<AmbientStar[]>,
  particlesRef: MutableRefObject<Particle[]>,
  ambientStarsRef: MutableRefObject<AmbientStar[]>,
  timelineRef: MutableRefObject<TimelineState>,
) {
  const startTime = performance.now();
  particlesRef.current = cloneParticles(particleTemplateRef.current);
  ambientStarsRef.current = cloneAmbientStars(ambientTemplateRef.current);
  timelineRef.current = {
    activeSince: startTime,
    lastTickAt: startTime,
    settled: false,
  };
}

function renderParticleScene({
  context,
  viewportWidth,
  viewportHeight,
  particles,
  stars,
  now,
  deltaMs,
  active,
  activeSince,
  includeBackdrop,
}: {
  context: CanvasRenderingContext2D;
  viewportWidth: number;
  viewportHeight: number;
  particles: Particle[];
  stars: AmbientStar[];
  now: number;
  deltaMs: number;
  active: boolean;
  activeSince: number | null;
  includeBackdrop: boolean;
}) {
  if (includeBackdrop) {
    drawBackdrop(context, viewportWidth, viewportHeight);
  } else {
    context.clearRect(0, 0, viewportWidth, viewportHeight);
  }

  context.globalCompositeOperation = "source-over";
  stepAmbientStars(stars, viewportWidth, viewportHeight, deltaMs);
  drawAmbientStars(context, stars, now);
  stepParticles(particles, active, now, deltaMs, activeSince);
  drawParticles(context, particles, active, now, activeSince);
}

function stepAmbientStars(
  stars: AmbientStar[],
  width: number,
  height: number,
  deltaMs: number,
) {
  const frameFactor = getFrameFactor(deltaMs);

  for (const star of stars) {
    star.x += star.vx * frameFactor;
    star.y += star.vy * frameFactor;

    if (star.x < 0) {
      star.x = width;
    } else if (star.x > width) {
      star.x = 0;
    }

    if (star.y < 0) {
      star.y = height;
    } else if (star.y > height) {
      star.y = 0;
    }
  }
}

function drawAmbientStars(
  context: CanvasRenderingContext2D,
  stars: AmbientStar[],
  now: number,
) {
  for (const star of stars) {
    const shimmer = 0.35 + Math.sin(now * 0.0014 + star.phase) * 0.25;
    context.fillStyle = `rgba(${star.r}, ${star.g}, ${star.b}, ${star.alpha * shimmer})`;
    context.fillRect(star.x, star.y, star.size, star.size);
  }
}

function stepParticles(
  particles: Particle[],
  active: boolean,
  now: number,
  deltaMs: number,
  activeSince: number | null,
) {
  const frameFactor = getFrameFactor(deltaMs);
  const elapsedSinceActive =
    active && activeSince !== null ? Math.max(0, now - activeSince) : 0;
  const assemblyProgress = getAssemblyProgress(elapsedSinceActive);
  const easedAssembly = easeInOutCubic(assemblyProgress);
  const inLeadIn = active && elapsedSinceActive < ASSEMBLY_LEAD_IN_MS;

  for (const particle of particles) {
    if (!active || inLeadIn) {
      const flowStrength = inLeadIn ? 1.25 : 1;
      particle.vx +=
        Math.cos(now * 0.00052 + particle.drift) * 0.006 * frameFactor * flowStrength;
      particle.vy +=
        Math.sin(now * 0.00046 + particle.drift) * 0.006 * frameFactor * flowStrength;
      particle.vx *= Math.pow(0.985, frameFactor);
      particle.vy *= Math.pow(0.985, frameFactor);
      particle.x += particle.vx * frameFactor;
      particle.y += particle.vy * frameFactor;

      const alphaTarget = inLeadIn ? 0.46 : 0.4;
      const alphaFactor = 1 - Math.pow(1 - 0.045, frameFactor);
      particle.alpha += (alphaTarget - particle.alpha) * alphaFactor;

      if (particle.x < -4) {
        particle.x = particle.boundsWidth + 4;
      } else if (particle.x > particle.boundsWidth + 4) {
        particle.x = -4;
      }

      if (particle.y < -4) {
        particle.y = particle.boundsHeight + 4;
      } else if (particle.y > particle.boundsHeight + 4) {
        particle.y = -4;
      }

      continue;
    }

    const attractionTarget =
      particle.kind === "text"
        ? 0.008 + easedAssembly * 0.05
        : 0.006 + easedAssembly * 0.04;
    const attractionFactor = 1 - Math.pow(1 - attractionTarget, frameFactor);
    particle.x += (particle.targetX - particle.x) * attractionFactor;
    particle.y += (particle.targetY - particle.y) * attractionFactor;
    particle.vx *= Math.pow(0.9, frameFactor);
    particle.vy *= Math.pow(0.9, frameFactor);

    const alphaTarget = 0.46 + easedAssembly * (particle.targetAlpha - 0.46);
    const alphaFactor = 1 - Math.pow(1 - 0.08, frameFactor);
    particle.alpha += (alphaTarget - particle.alpha) * alphaFactor;
  }
}

function drawParticles(
  context: CanvasRenderingContext2D,
  particles: Particle[],
  active: boolean,
  now: number,
  activeSince: number | null,
) {
  const elapsedSinceActive =
    active && activeSince !== null ? Math.max(0, now - activeSince) : 0;
  const assemblyProgress = getAssemblyProgress(elapsedSinceActive);
  const easedAssembly = easeInOutCubic(assemblyProgress);

  context.globalCompositeOperation = "lighter";

  for (const particle of particles) {
    const jitterStrength = active ? 0.3 * (1 - easedAssembly * 0.82) : 0;
    const jitterX = Math.sin(now * 0.0012 + particle.drift) * jitterStrength;
    const jitterY = Math.cos(now * 0.001 + particle.drift) * jitterStrength;
    const shimmer = active
      ? 0.88 + Math.sin(now * 0.0016 + particle.twinkle) * 0.12
      : 0.78;

    context.fillStyle =
      particle.kind === "text"
        ? `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha * shimmer})`
        : `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.alpha})`;

    context.fillRect(
      particle.x + jitterX,
      particle.y + jitterY,
      particle.size,
      particle.size,
    );

    if (particle.kind === "text" && active && particle.sparkle > 0.68) {
      context.fillStyle = `rgba(255, 248, 231, ${particle.alpha * 0.28})`;
      context.fillRect(
        particle.x + jitterX - 0.5,
        particle.y + jitterY - 0.5,
        particle.size + 1,
        particle.size + 1,
      );
    }
  }
}

function drawBackdrop(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.clearRect(0, 0, width, height);

  const skyGradient = context.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, "#0b1122");
  skyGradient.addColorStop(0.5, "#040711");
  skyGradient.addColorStop(1, "#010207");
  context.fillStyle = skyGradient;
  context.fillRect(0, 0, width, height);

  const leftGlow = context.createRadialGradient(
    width * 0.2,
    height * 0.26,
    0,
    width * 0.2,
    height * 0.26,
    width * 0.36,
  );
  leftGlow.addColorStop(0, "rgba(72, 96, 180, 0.2)");
  leftGlow.addColorStop(1, "rgba(72, 96, 180, 0)");
  context.fillStyle = leftGlow;
  context.fillRect(0, 0, width, height);

  const rightGlow = context.createRadialGradient(
    width * 0.8,
    height * 0.2,
    0,
    width * 0.8,
    height * 0.2,
    width * 0.3,
  );
  rightGlow.addColorStop(0, "rgba(233, 164, 79, 0.14)");
  rightGlow.addColorStop(1, "rgba(233, 164, 79, 0)");
  context.fillStyle = rightGlow;
  context.fillRect(0, 0, width, height);

  const floorGlow = context.createRadialGradient(
    width * 0.5,
    height * 0.9,
    0,
    width * 0.5,
    height * 0.9,
    width * 0.48,
  );
  floorGlow.addColorStop(0, "rgba(35, 47, 88, 0.46)");
  floorGlow.addColorStop(1, "rgba(35, 47, 88, 0)");
  context.fillStyle = floorGlow;
  context.fillRect(0, 0, width, height);
}

function cloneParticles(particles: Particle[]) {
  return particles.map((particle) => ({ ...particle }));
}

function cloneAmbientStars(stars: AmbientStar[]) {
  return stars.map((star) => ({ ...star }));
}

function getAssemblyProgress(elapsedSinceActive: number) {
  return clamp(
    (elapsedSinceActive - ASSEMBLY_LEAD_IN_MS) / ASSEMBLY_DURATION_MS,
    0,
    1,
  );
}

function getFrameFactor(deltaMs: number) {
  return Math.max(0.4, Math.min(deltaMs / 16.6667, 4));
}

function easeInOutCubic(value: number) {
  if (value < 0.5) {
    return 4 * value * value * value;
  }

  return 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function exportPoster(
  scene: PreparedScene | null,
  particleTemplate: Particle[],
  ambientTemplate: AmbientStar[],
  fileBaseName = "birthday-blessing",
) {
  if (!scene || particleTemplate.length === 0) {
    throw new Error("画布还没有准备好，请稍后再试。");
  }

  const exportCanvas = createExportCanvas(scene.viewportWidth, scene.viewportHeight);
  const context = exportCanvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建导出画布。");
  }

  context.imageSmoothingEnabled = true;

  const particles = cloneParticles(particleTemplate);
  const stars = cloneAmbientStars(ambientTemplate);
  simulateSceneToTime({
    context,
    viewportWidth: scene.viewportWidth,
    viewportHeight: scene.viewportHeight,
    particles,
    stars,
    durationMs: ASSEMBLY_LEAD_IN_MS + ASSEMBLY_DURATION_MS + FINAL_HOLD_MS,
    frameStepMs: 1000 / 24,
    includeBackdrop: true,
  });

  const blob = await canvasToBlob(exportCanvas, "image/png");
  downloadBlob(blob, `${sanitizeFileBaseName(fileBaseName)}.png`);
}

async function exportGif(
  scene: PreparedScene | null,
  particleTemplate: Particle[],
  ambientTemplate: AmbientStar[],
  fileBaseName = "birthday-blessing",
) {
  if (!scene || particleTemplate.length === 0) {
    throw new Error("画布还没有准备好，请稍后再试。");
  }

  const scale = Math.min(1, EXPORT_MAX_EDGE / Math.max(scene.viewportWidth, scene.viewportHeight));
  const exportCanvas = createExportCanvas(scene.viewportWidth, scene.viewportHeight, scale);
  const context = exportCanvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建 GIF 导出画布。");
  }

  context.imageSmoothingEnabled = true;

  const gif = GIFEncoder();
  const frameDelayMs = Math.round(1000 / GIF_FRAME_RATE);
  const animatedDurationMs = ASSEMBLY_LEAD_IN_MS + ASSEMBLY_DURATION_MS;
  const particles = cloneParticles(particleTemplate);
  const stars = cloneAmbientStars(ambientTemplate);

  let elapsed = 0;
  let frameIndex = 0;

  while (elapsed < animatedDurationMs) {
    renderParticleScene({
      context,
      viewportWidth: scene.viewportWidth,
      viewportHeight: scene.viewportHeight,
      particles,
      stars,
      now: elapsed,
      deltaMs: frameDelayMs,
      active: true,
      activeSince: 0,
      includeBackdrop: true,
    });

    const imageData = context.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
    const palette = quantize(imageData.data, GIF_MAX_COLORS);
    const indexedFrame = applyPalette(imageData.data, palette);
    gif.writeFrame(indexedFrame, exportCanvas.width, exportCanvas.height, {
      palette,
      delay: frameDelayMs,
      repeat: frameIndex === 0 ? 0 : undefined,
    });

    elapsed += frameDelayMs;
    frameIndex += 1;

    if (frameIndex % 4 === 0) {
      await nextFrame();
    }
  }

  renderParticleScene({
    context,
    viewportWidth: scene.viewportWidth,
    viewportHeight: scene.viewportHeight,
    particles,
    stars,
    now: animatedDurationMs + FINAL_HOLD_MS,
    deltaMs: FINAL_HOLD_MS,
    active: true,
    activeSince: 0,
    includeBackdrop: true,
  });

  const finalFrame = context.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
  const finalPalette = quantize(finalFrame.data, GIF_MAX_COLORS);
  const finalIndexedFrame = applyPalette(finalFrame.data, finalPalette);
  gif.writeFrame(finalIndexedFrame, exportCanvas.width, exportCanvas.height, {
    palette: finalPalette,
    delay: FINAL_HOLD_MS,
  });

  gif.finish();

  const gifBinary = Uint8Array.from(gif.bytesView());

  downloadBlob(
    new Blob([gifBinary], { type: "image/gif" }),
    `${sanitizeFileBaseName(fileBaseName)}.gif`,
  );
}

function simulateSceneToTime({
  context,
  viewportWidth,
  viewportHeight,
  particles,
  stars,
  durationMs,
  frameStepMs,
  includeBackdrop,
}: {
  context: CanvasRenderingContext2D;
  viewportWidth: number;
  viewportHeight: number;
  particles: Particle[];
  stars: AmbientStar[];
  durationMs: number;
  frameStepMs: number;
  includeBackdrop: boolean;
}) {
  let elapsed = 0;

  while (elapsed < durationMs) {
    renderParticleScene({
      context,
      viewportWidth,
      viewportHeight,
      particles,
      stars,
      now: elapsed,
      deltaMs: frameStepMs,
      active: true,
      activeSince: 0,
      includeBackdrop,
    });

    elapsed += frameStepMs;
  }

  renderParticleScene({
    context,
    viewportWidth,
    viewportHeight,
    particles,
    stars,
    now: durationMs,
    deltaMs: 16.6667,
    active: true,
    activeSince: 0,
    includeBackdrop,
  });
}

function createExportCanvas(width: number, height: number, scale = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const context = canvas.getContext("2d");

  if (context) {
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("导出失败，浏览器没有返回图像数据。"));
        return;
      }

      resolve(blob);
    }, type);
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function sanitizeFileBaseName(fileBaseName: string) {
  const normalized = fileBaseName
    .trim()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");

  return normalized || "birthday-blessing";
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
}
