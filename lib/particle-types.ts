import type { MutableRefObject } from "react";

export type TargetKind = "image" | "text";

export type TargetPoint = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  a: number;
  kind: TargetKind;
};

export type PreparedScene = {
  targets: TargetPoint[];
  viewportWidth: number;
  viewportHeight: number;
};

export type ParticleCanvasProps = {
  imageSource: HTMLImageElement | null;
  text: string;
  active: boolean;
  replayToken?: number;
  controllerRef?: MutableRefObject<ParticleCanvasController | null>;
  onReady?: () => void;
  onError?: (message: string) => void;
  onSettled?: () => void;
};

export type ParticleCanvasController = {
  replay: () => void;
  downloadPoster: (fileBaseName?: string) => Promise<void>;
  downloadGif: (fileBaseName?: string) => Promise<void>;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  drift: number;
  twinkle: number;
  sparkle: number;
  ease: number;
  alpha: number;
  targetAlpha: number;
  size: number;
  r: number;
  g: number;
  b: number;
  kind: TargetKind;
  boundsWidth: number;
  boundsHeight: number;
};

export type AmbientStar = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  r: number;
  g: number;
  b: number;
};

export type PrepareTargetsInput = {
  imageSource: HTMLImageElement;
  text: string;
  viewportWidth: number;
  viewportHeight: number;
};
