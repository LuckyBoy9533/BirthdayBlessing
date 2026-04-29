"use client";

import dynamic from "next/dynamic";
import NextImage from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { ParticleCanvasController } from "@/lib/particle-types";

const ParticleCanvas = dynamic(() => import("@/components/particle-canvas"), {
  ssr: false,
});

type Phase = "idle" | "preparing" | "transitioning" | "animating" | "settled";
type ExportKind = "poster" | "gif" | null;

function loadImageFromDataUrl(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("图片加载失败，请改用透明 PNG 或清晰的人像照片。"));
    image.src = dataUrl;
  });
}

export default function BirthdayBlessingClient() {
  const [message, setMessage] = useState("祝你生日快乐");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("尚未选择图片");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasVisible, setCanvasVisible] = useState(false);
  const [exportingKind, setExportingKind] = useState<ExportKind>(null);

  const phaseRef = useRef<Phase>("idle");
  const transitionTimerRef = useRef<number | null>(null);
  const particleControllerRef = useRef<ParticleCanvasController | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const resetAnimationStage = () => {
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    setPhase("idle");
    setShowCanvas(false);
    setCanvasVisible(false);
    setExportingKind(null);
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    resetAnimationStage();
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onerror = () => {
      setError("读取图片失败，请重新选择一张图片。");
      setPreviewUrl(null);
      setImageSource(null);
    };

    reader.onload = async () => {
      if (typeof reader.result !== "string") {
        setError("图片格式暂时不支持，请换一张 PNG、JPG 或 WebP。");
        setPreviewUrl(null);
        setImageSource(null);
        return;
      }

      try {
        const image = await loadImageFromDataUrl(reader.result);
        setPreviewUrl(reader.result);
        setImageSource(image);
      } catch (loadError) {
        setPreviewUrl(null);
        setImageSource(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "图片解析失败，请尝试更换一张照片。",
        );
      }
    };

    reader.readAsDataURL(file);
  };

  const handleGenerate = () => {
    if (phase !== "idle") {
      return;
    }

    if (!imageSource) {
      setError("请先上传一张人物照片后再生成特效。");
      return;
    }

    if (!message.trim()) {
      setError("请输入一段生日祝福语。");
      return;
    }

    setError(null);
    setCanvasVisible(false);
    setShowCanvas(true);
    setExportingKind(null);
    setPhase("preparing");
  };

  const handleParticleReady = () => {
    if (phaseRef.current !== "preparing") {
      return;
    }

    setCanvasVisible(true);
    setPhase("transitioning");

    transitionTimerRef.current = window.setTimeout(() => {
      setPhase("animating");
      transitionTimerRef.current = null;
    }, 650);
  };

  const handleParticleSettled = () => {
    if (phaseRef.current !== "animating") {
      return;
    }

    setPhase("settled");
  };

  const handleParticleError = (messageFromCanvas: string) => {
    resetAnimationStage();
    setError(messageFromCanvas);
  };

  const handleReturnToEdit = () => {
    if (exportingKind) {
      return;
    }

    setError(null);
    resetAnimationStage();
  };

  const handleReplay = () => {
    if (!particleControllerRef.current || exportingKind) {
      return;
    }

    setError(null);
    setPhase("animating");
    particleControllerRef.current.replay();
  };

  const handleSavePoster = async () => {
    if (!particleControllerRef.current || exportingKind) {
      return;
    }

    setError(null);
    setExportingKind("poster");

    try {
      await particleControllerRef.current.downloadPoster(buildExportBaseName(fileName, message));
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "保存海报失败，请稍后再试。",
      );
    } finally {
      setExportingKind(null);
    }
  };

  const handleDownloadGif = async () => {
    if (!particleControllerRef.current || exportingKind) {
      return;
    }

    setError(null);
    setExportingKind("gif");

    try {
      await particleControllerRef.current.downloadGif(buildExportBaseName(fileName, message));
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "导出 GIF 失败，请稍后再试。",
      );
    } finally {
      setExportingKind(null);
    }
  };

  const panelHidden = phase !== "idle";
  const busy = phase === "preparing" || phase === "transitioning" || exportingKind !== null;
  const isResultVisible =
    showCanvas && (phase === "animating" || phase === "settled" || exportingKind !== null);
  const buttonLabel =
    phase === "preparing"
      ? "正在解析轮廓..."
      : phase === "transitioning"
        ? "正在点亮星光..."
        : phase === "animating"
          ? "星河正在汇聚"
          : phase === "settled"
            ? "星光已定格"
            : "生成特效";

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <div className="orbit-glow left-[12%] top-[18%] h-48 w-48 bg-[rgba(122,157,255,0.18)]" />
      <div
        className="orbit-glow pulse-soft right-[10%] top-[8%] h-56 w-56 bg-[rgba(245,189,96,0.16)]"
        style={{ animationDelay: "-2s" }}
      />
      <div
        className="orbit-glow bottom-[8%] left-[22%] h-44 w-44 bg-[rgba(255,180,148,0.13)]"
        style={{ animationDelay: "-5s" }}
      />

      {showCanvas && imageSource ? (
        <>
          <div
            className={[
              "pointer-events-none absolute inset-0 transition-opacity duration-700",
              canvasVisible ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            <ParticleCanvas
              imageSource={imageSource}
              text={message}
              active={
                phase === "animating" ||
                phase === "settled" ||
                exportingKind !== null
              }
              controllerRef={particleControllerRef}
              onReady={handleParticleReady}
              onError={handleParticleError}
              onSettled={handleParticleSettled}
            />
          </div>

          <div
            className={[
              "absolute inset-x-0 top-0 z-20 flex justify-center px-4 pt-6 transition-all duration-500 sm:px-6",
              isResultVisible ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
            ].join(" ")}
          >
            <div className="panel-shell relative flex w-full max-w-5xl flex-col gap-4 rounded-[28px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="gold-ring rounded-[28px]" />
              <div className="relative">
                <div className="text-xs tracking-[0.24em] text-[rgba(245,230,199,0.55)] uppercase">
                  Result Stage
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
                  {phase === "settled" ? "星河已经定格，可以保存或导出动画。" : "粒子正在缓慢汇聚，请稍等它完整成形。"}
                </div>
              </div>

              <div className="relative flex flex-wrap items-center gap-3">
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/6 px-4 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleReturnToEdit}
                  disabled={exportingKind !== null}
                >
                  返回编辑
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(245,210,154,0.22)] bg-[rgba(245,210,154,0.1)] px-4 text-sm font-medium text-[rgba(255,241,216,0.96)] transition-colors hover:bg-[rgba(245,210,154,0.16)] disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleReplay}
                  disabled={phase !== "settled" || exportingKind !== null}
                >
                  重新播放
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-black/22 px-4 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={handleSavePoster}
                  disabled={phase !== "settled" || exportingKind !== null}
                >
                  {exportingKind === "poster" ? "正在保存海报..." : "保存 PNG"}
                </button>
                <button
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f3d7a4,#f0b662)] px-4 text-sm font-semibold text-[#1b140b] shadow-[0_12px_32px_rgba(240,182,98,0.22)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                  onClick={handleDownloadGif}
                  disabled={phase !== "settled" || exportingKind !== null}
                >
                  {exportingKind === "gif" ? "正在导出 GIF..." : "下载 GIF"}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <section
        className={[
          "panel-shell relative z-10 w-full max-w-5xl overflow-hidden rounded-[32px] transition-all duration-700",
          panelHidden
            ? "pointer-events-none translate-y-10 scale-95 opacity-0"
            : "translate-y-0 scale-100 opacity-100",
        ].join(" ")}
      >
        <div className="gold-ring" />

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(248,220,165,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(100,130,255,0.12),transparent_28%)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs tracking-[0.28em] text-[rgba(245,233,206,0.82)] uppercase">
                Birthday Constellation
              </div>

              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl leading-tight font-semibold text-[var(--text-primary)] sm:text-5xl">
                  把一张照片，
                  <br />
                  点亮成一场生日星河。
                </h1>
                <p className="max-w-xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
                  上传透明背景 PNG 能获得最锐利的人物轮廓；普通照片也可以，我们会在浏览器里自动做人像分割后再生成粒子。
                </p>
              </div>

              <div className="grid gap-3 text-sm text-[rgba(248,239,220,0.8)] sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                  <div className="text-xs tracking-[0.24em] text-white/45 uppercase">
                    Photo
                  </div>
                  <div className="mt-2 font-medium">保留人物原图颜色</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                  <div className="text-xs tracking-[0.24em] text-white/45 uppercase">
                    Text
                  </div>
                  <div className="mt-2 font-medium">暖金发光祝福文字</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3">
                  <div className="text-xs tracking-[0.24em] text-white/45 uppercase">
                    Motion
                  </div>
                  <div className="mt-2 font-medium">先漫游，再缓慢汇聚定格</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_24%),radial-gradient(circle_at_top,rgba(97,126,255,0.1),transparent_34%)]" />
            <div className="relative flex h-full flex-col gap-5">
              <div>
                <div className="text-xs tracking-[0.26em] text-[rgba(245,230,199,0.58)] uppercase">
                  Creative Panel
                </div>
                <div className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  制作你的生日祝福舞台
                </div>
              </div>

              <label className="group flex cursor-pointer flex-col gap-4 rounded-[28px] border border-dashed border-white/16 bg-black/18 p-4 transition-colors hover:border-[rgba(245,210,154,0.42)]">
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
                  onChange={handleImageChange}
                  disabled={busy}
                />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">
                      上传朋友的照片
                    </div>
                    <div className="mt-1 text-xs leading-6 text-[var(--text-muted)]">
                      推荐透明 PNG，普通照片会自动尝试分割人物前景。
                    </div>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-[rgba(248,235,203,0.82)]">
                    选择图片
                  </span>
                </div>

                <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[rgba(255,255,255,0.04)]">
                  {previewUrl ? (
                    <div className="grid min-h-56 gap-0 sm:grid-cols-[0.95fr_1.05fr]">
                      <div className="relative min-h-56 bg-black/30">
                        <NextImage
                          alt="上传预览"
                          className="object-cover"
                          fill
                          sizes="(min-width: 640px) 30rem, 100vw"
                          src={previewUrl}
                          unoptimized
                        />
                      </div>
                      <div className="flex flex-col justify-between gap-4 p-4">
                        <div>
                          <div className="text-xs tracking-[0.24em] text-white/38 uppercase">
                            Preview
                          </div>
                          <div className="mt-2 line-clamp-2 text-sm font-medium text-[var(--text-primary)]">
                            {fileName}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-black/22 px-4 py-3 text-xs leading-6 text-[var(--text-muted)]">
                          如果人物边缘已经是透明背景，最终粒子轮廓会更干净、更像从夜空里浮现出来。
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-56 items-center justify-center px-6 py-10 text-center text-sm leading-7 text-[var(--text-muted)]">
                      还没有选择图片。
                      <br />
                      点击这里上传一张朋友的人像照开始制作。
                    </div>
                  )}
                </div>
              </label>

              <div className="star-divider" />

              <label className="space-y-3">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  祝福语
                </div>
                <textarea
                  className="min-h-32 w-full rounded-[24px] border border-white/10 bg-black/22 px-4 py-4 text-base leading-7 text-[var(--text-primary)] outline-none transition-colors placeholder:text-white/30 focus:border-[rgba(245,210,154,0.42)]"
                  placeholder="例如：祝小红生日快乐，愿你被星光与好运拥抱。"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={busy}
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-[rgba(255,191,146,0.24)] bg-[rgba(255,166,114,0.09)] px-4 py-3 text-sm leading-6 text-[rgba(255,224,199,0.92)]">
                  {error}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/18 px-4 py-3 text-sm leading-6 text-[var(--text-muted)]">
                  点击生成后会先做轮廓采样，成功后控制面板将淡出，粒子会先漫游片刻，再慢慢汇聚成照片与祝福语。
                </div>
              )}

              <button
                className="mt-auto inline-flex min-h-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f3d7a4,#f0b662)] px-6 text-base font-semibold text-[#1b140b] shadow-[0_18px_44px_rgba(240,182,98,0.28)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                type="button"
                onClick={handleGenerate}
                disabled={busy}
              >
                {buttonLabel}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function buildExportBaseName(fileName: string, message: string) {
  const baseName = fileName.replace(/\.[a-z0-9]+$/i, "").trim();
  const messageSnippet = message
    .trim()
    .slice(0, 16)
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-");

  return [baseName || "birthday-blessing", messageSnippet || "birthday"]
    .filter(Boolean)
    .join("-");
}
