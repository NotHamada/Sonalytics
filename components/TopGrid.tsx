"use client";

import { useTranslations } from "next-intl";
import type { RankedItem } from "@/lib/historyAnalytics";
import { Carousel, type CarouselItem } from "./sona/collections";

interface RankedItemWithImage extends RankedItem {
  image?: string | null;
}

/** Track ids are the last segment of the Spotify URI ("spotify:track:abc123" -> "abc123"). */
function trackHref(item: RankedItemWithImage): string | null {
  const id = item.trackUri?.split(":").pop();
  return id ? `/track/${id}` : null;
}

function hrefFor(item: RankedItemWithImage, linkType?: "track" | "artist" | "album"): string | null {
  if (linkType === "track") return trackHref(item);
  if (linkType === "artist") return `/artist/${encodeURIComponent(item.name)}`;
  if (linkType === "album") return `/album/${encodeURIComponent(item.name)}`;
  return null;
}

export default function TopGrid({
  title,
  items,
  imageShape = "square",
  linkType,
}: {
  title: string;
  items: RankedItemWithImage[];
  imageShape?: "square" | "circle";
  /** When set, each tile links to that item's detail page. */
  linkType?: "track" | "artist" | "album";
}) {
  const tCommon = useTranslations("common");

  const carouselItems: CarouselItem[] = items.map((item, i) => ({
    // name+subtitle isn't unique — a track released on several albums gets a distinct Spotify id
    // per release, so fold in the position too.
    key: `${i}-${item.trackUri ?? item.name}`,
    title: item.name,
    subtitle: [item.subtitle, tCommon("units.plays", { count: item.plays })].filter(Boolean).join(" · "),
    image: item.image,
    href: hrefFor(item, linkType),
  }));

  return <Carousel title={title} items={carouselItems} shape={imageShape} />;
}
