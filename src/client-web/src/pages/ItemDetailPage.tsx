import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import type { ApiFeedItem } from "connectors/types";
import type { RenderMethodKey } from "../state/feedState";
import { getAvailableMethods } from "../state/feedState";
import { MethodToggle } from "../components/MethodToggle";
import { VideoRenderer } from "../renderers/VideoRenderer";
import { RichTextRenderer } from "../renderers/RichTextRenderer";
import { AudioRenderer } from "../renderers/AudioRenderer";
import { EmbedRenderer } from "../renderers/EmbedRenderer";
import { formatDate } from "../utils/format";

export const ItemDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const item = (location.state as { item?: ApiFeedItem } | null)?.item ?? null;

  const [selectedMethod, setSelectedMethod] = useState<RenderMethodKey | null>(null);

  const availableMethods = item ? getAvailableMethods(item) : [];
  const activeMethod: RenderMethodKey = selectedMethod ?? availableMethods[0];

  if (!item) {
    return (
      <div className="flex flex-col h-full">
        <button
          className="flex items-center gap-2 px-3 py-3 text-[var(--text-secondary)] bg-transparent border-0 cursor-pointer text-sm hover:text-[var(--text-primary)] transition-colors self-start"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <p className="px-4 text-[var(--text-tertiary)] text-sm">Item not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Back navigation */}
      <div className="flex items-center flex-shrink-0 pt-3 px-3 pb-0">
        <button
          className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-secondary)] bg-transparent border-0 cursor-pointer hover:bg-[var(--background-hover)] hover:text-[var(--text-primary)] transition-colors"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 pb-8">
        {/* Item header */}
        <div className="flex flex-col gap-2 px-[var(--gutter)] pt-3 pb-3">
          <div className="flex gap-2 items-center">
            <span className="text-[length:var(--xs)] font-semibold uppercase tracking-[0.04em] text-[var(--text-tertiary)]">
              {item.sourceName}
            </span>
            <span className="text-[length:var(--xs)] text-[var(--text-tertiary)]">
              {formatDate(item.publishedAt)}
            </span>
          </div>
          <h1 className="text-[length:var(--lg)] font-bold leading-snug m-0 text-[var(--text-primary)]">
            {item.title}
          </h1>
          {availableMethods.length > 1 && (
            <div className="pt-1">
              <MethodToggle
                methods={availableMethods}
                selected={activeMethod}
                onSelect={setSelectedMethod}
              />
            </div>
          )}
        </div>

        {/* Content renderer */}
        <div className="pt-3">
          {activeMethod === "video" && item.renderData.video && (
            <VideoRenderer data={item.renderData.video} />
          )}
          {activeMethod === "richText" && item.renderData.richText && (
            <RichTextRenderer data={item.renderData.richText} />
          )}
          {activeMethod === "audio" && item.renderData.audio && (
            <AudioRenderer data={item.renderData.audio} />
          )}
          {activeMethod === "embed" && item.renderData.embed && (
            <EmbedRenderer data={item.renderData.embed} />
          )}
        </div>

        {/* Read original link */}
        <div className="px-[var(--gutter)] pt-4 pb-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--background-input)] px-3 py-1.5 text-sm text-[var(--text-primary)] font-medium shadow-sm hover:border-[var(--border-hover)] transition-colors no-underline"
          >
            Read original
          </a>
        </div>
      </div>
    </div>
  );
};
