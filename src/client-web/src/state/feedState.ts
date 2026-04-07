import { proxy } from "valtio";
import type { AS2Object } from "connectors/types";

export type RendererKey = "video" | "audio" | "embed" | "content";

interface FeedState {
  selectedMethod: RendererKey | null;
  selectedFeed: string | null;
  // IDs of items marked read/later in this session — kept visible until refresh
  readItemIds: string[];
}

export const feedState = proxy<FeedState>({
  selectedMethod: null,
  selectedFeed: null,
  readItemIds: [],
});

export const getAvailableRenderers = (item: AS2Object): RendererKey[] => {
  const keys: RendererKey[] = [];
  if (item.type === "Video" || item.attachment?.some((a) => a.rel === "video")) keys.push("video");
  if (item.type === "Audio" || item.attachment?.some((a) => a.rel === "enclosure")) keys.push("audio");
  if (item.type === "Page" || item.attachment?.some((a) => a.rel === "embed")) keys.push("embed");
  if (item.content != null || item.summary != null) keys.push("content");
  return keys;
};
