import type { StatusDef } from "../../lib/status";

export const MEDIA_TYPE_VALUES = ["image", "video", "document", "audio"] as const;
export type MediaType = (typeof MEDIA_TYPE_VALUES)[number];

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  folder: string;
  url: string;
  /** Size in bytes. */
  size: number;
  /** e.g. "1920×1080" for images/video; empty otherwise. */
  dimensions: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface MediaSummary {
  totalAssets: number;
  images: number;
  /** Total storage used, in bytes. */
  storageUsed: number;
  folders: number;
}

export const MEDIA_TYPES: readonly StatusDef<MediaType>[] = [
  { value: "image", label: "Image", tone: "info" },
  { value: "video", label: "Video", tone: "warning" },
  { value: "document", label: "Document", tone: "neutral" },
  { value: "audio", label: "Audio", tone: "success" },
];
