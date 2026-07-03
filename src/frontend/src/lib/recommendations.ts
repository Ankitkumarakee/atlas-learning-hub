import { ContentType } from "@/backend";
import type { Recommendation } from "@/types";
import type { ContentCardItem, ContentKind } from "@/types";

/** Map a backend ContentType variant to the frontend ContentKind discriminator. */
export function contentTypeToKind(contentType: ContentType): ContentKind {
  switch (contentType) {
    case ContentType.blog:
      return "blog";
    case ContentType.note:
      return "note";
    case ContentType.video:
      return "video";
  }
}

/**
 * Convert a backend Recommendation (lightweight contentRef + score + reason)
 * into the normalized ContentCardItem payload that the shared ContentCard
 * component expects. Fields not present on the recommendation (excerpt,
 * counts, timestamps) are filled with neutral defaults so the card still
 * renders cleanly without misleading numbers.
 */
export function recommendationToCardItem(rec: Recommendation): ContentCardItem {
  const { contentRef, reason } = rec;
  return {
    id: contentRef.id,
    kind: contentTypeToKind(contentRef.contentType),
    title: contentRef.title,
    excerpt: reason || "Related content you might enjoy.",
    author: contentRef.author.toText().slice(0, 12),
    createdAt: 0n,
    likeCount: 0n,
  };
}

/** Convert a list of recommendations into card items. */
export function recommendationsToCardItems(
  recs: Recommendation[],
): ContentCardItem[] {
  return recs.map(recommendationToCardItem);
}
