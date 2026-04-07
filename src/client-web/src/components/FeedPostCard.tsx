import { useEffect, useRef, memo, type MouseEvent } from "react";
import { BookmarkSimple, Export, Check } from "@phosphor-icons/react";
import type { AS2Object } from "connectors/types";
import type { RendererKey } from "../state/feedState";
import { getAvailableRenderers } from "../state/feedState";
import { MethodToggle } from "./MethodToggle";
import { VideoRenderer } from "../renderers/VideoRenderer";
import { RichTextRenderer } from "../renderers/RichTextRenderer";
import { AudioRenderer } from "../renderers/AudioRenderer";
import { EmbedRenderer } from "../renderers/EmbedRenderer";
import { formatRelativeDate, getDomain } from "../utils/format";
import styles from "./FeedPostCard.module.css";

export interface FeedPostCardProps {
  item: AS2Object;
  isRead: boolean;
  isSaved: boolean;
  onRead: (id: string) => void | Promise<void>;
  onBookmark: (id: string) => void | Promise<void>;
  onShare: (item: AS2Object) => void | Promise<void>;
  selectedMethod: RendererKey | null;
  onSelectMethod: (method: RendererKey) => void;
}

export const FeedPostCard = memo(({
  item,
  isRead,
  isSaved,
  onRead,
  onBookmark,
  onShare,
  selectedMethod,
  onSelectMethod,
}: FeedPostCardProps) => {
  console.log(`🃏 FeedPostCard render — id=${item.id} isRead=${isRead} isSaved=${isSaved} method=${selectedMethod}`);

  const cardRef = useRef<HTMLElement>(null);
  const availableMethods = getAvailableRenderers(item);
  const activeMethod: RendererKey = selectedMethod ?? availableMethods[0];

  const videoLink = item.attachment?.find((a) => a.rel === "video");
  const audioLink = item.attachment?.find((a) => a.rel === "enclosure");
  const embedLink = item.attachment?.find((a) => a.rel === "embed") ?? item.attachment?.[0];

  // Keep a ref to the latest onRead so the observer effect doesn't need to
  // include it in its dependency array — otherwise a new function reference
  // on every parent render would recreate the observer on every render, which
  // cascades into a render loop that crashes the tab during scrolling.
  const onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  });

  // Auto-mark as read when item scrolls to the center of the screen
  useEffect(() => {
    const el = cardRef.current;
    if (!el || isRead) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log(`🃏 FeedPostCard intersection — marking read id=${item.id}`);
          onReadRef.current(item.id);
        }
      },
      // rootMargin shrinks the intersection root to a horizontal strip at the
      // vertical center of the viewport, so the item is "read" when its top
      // edge crosses the midpoint of the screen.
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [item.id, isRead]); // onRead intentionally omitted — accessed via ref above

  const handleShare = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare(item);
  };

  const handleBookmark = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark(item.id);
  };

  return (
    <article
      ref={cardRef}
      className={[styles.post, isRead ? styles.postRead : ""].join(" ")}
    >
      {/* Clickable area opens the article */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.postBody}
      >
        <div className={styles.sourceMeta}>
          {item.sourceIconUrl && (
            <img src={item.sourceIconUrl} alt="" className={styles.sourceIcon} width={8} height={8} />
          )}
          <span className={styles.sourceName}>{item.sourceName}</span>
        </div>

        {item.name && <h2 className={styles.title}>{item.name}</h2>}

        {/* Only show summary when there's no full content — avoids duplicating the same content */}
        {item.summary && item.content == null && (
          <p className={styles.description}>{item.summary}</p>
        )}
      </a>

      {availableMethods.length > 0 && (
        <div className={styles.rendererArea}>
          {availableMethods.length > 1 && (
            <div className={styles.toggleRow}>
              <MethodToggle
                methods={availableMethods}
                selected={activeMethod}
                onSelect={onSelectMethod}
              />
            </div>
          )}
          {activeMethod === "video" && videoLink && (
            <VideoRenderer embedUrl={videoLink.href} />
          )}
          {activeMethod === "content" && (
            <RichTextRenderer content={item.content ?? item.summary} mediaType={item.mediaType} />
          )}
          {activeMethod === "audio" && audioLink && (
            <AudioRenderer audioUrl={audioLink.href} />
          )}
          {activeMethod === "embed" && embedLink && (
            <EmbedRenderer url={embedLink.href} />
          )}
        </div>
      )}

      <div className={styles.postItemMeta}>
        <span className={styles.sourceUrl}>{getDomain(item.sourceUrl || item.url)}</span>
        <span className={styles.metaSep}>·</span>
        <span className={styles.publishedAt}>{formatRelativeDate(item.published ?? "")}</span>
      </div>

      <div className={styles.postActions}>
        {isRead && (
          <span className={styles.readIndicator}>
            <Check size={13} weight="bold" />
          </span>
        )}
        <button
          className={[styles.actionButton, styles.actionButtonRight, isSaved ? styles.actionButtonActive : ""].join(" ")}
          onClick={handleBookmark}
          aria-label="Save for later"
        >
          {/* Only fill the bookmark when the item has been explicitly saved */}
          <BookmarkSimple size={20} weight={isSaved ? "fill" : "regular"} />
        </button>
        <button
          className={styles.actionButton}
          onClick={handleShare}
          aria-label="Share"
        >
          <Export size={20} />
        </button>
      </div>
    </article>
  );
});
