import { proxy } from "valtio";
import type { ApiFeedItem } from "connectors/types";

export type RenderMethodKey = "video" | "richText" | "audio" | "embed";

interface FeedState {
  selectedMethod: RenderMethodKey | null;
  selectedFeed: string | null;
  // IDs of items marked read/later in this session — kept visible until refresh
  readItemIds: string[];
}

export const feedState = proxy<FeedState>({
  selectedMethod: null,
  selectedFeed: null,
  readItemIds: [],
});

export const getAvailableMethods = (item: ApiFeedItem): RenderMethodKey[] => {
  const methods: RenderMethodKey[] = [];
  if (item.renderData.video) methods.push("video");
  if (item.renderData.richText) methods.push("richText");
  if (item.renderData.audio) methods.push("audio");
  if (item.renderData.embed) methods.push("embed");
  return methods;
};
