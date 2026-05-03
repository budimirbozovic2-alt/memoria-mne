// Single source of truth for card frequency tagging UX.
// All UI surfaces read/write `Card.frequencyTag` exclusively. Legacy
// `tags[]` entries ("često-na-ispitu" / "rijetko-na-ispitu") are stripped
// on touch via `setCardFrequency`, and migrated en-masse on boot.
import type { Card } from "./types";
import type { FrequencyTag } from "./types";

export const LEGACY_FREQUENT_TAG = "često-na-ispitu";
export const LEGACY_RARE_TAG = "rijetko-na-ispitu";

export function stripLegacyFrequencyTags(tags: string[] | undefined): string[] | undefined {
  if (!tags || tags.length === 0) return tags;
  const next = tags.filter((t) => t !== LEGACY_FREQUENT_TAG && t !== LEGACY_RARE_TAG);
  if (next.length === tags.length) return tags;
  return next.length > 0 ? next : undefined;
}

export function setCardFrequency(card: Card, value: FrequencyTag | null): Card {
  const cleanedTags = stripLegacyFrequencyTags(card.tags);
  return {
    ...card,
    frequencyTag: value ?? undefined,
    tags: cleanedTags,
  };
}

export interface FrequencyMeta {
  label: string;
  shortLabel: string;
  /** Tailwind text color class for the Flame icon. */
  iconClass: string;
  /** Tailwind classes for badge backgrounds. */
  badgeClass: string;
}

const META: Record<FrequencyTag, FrequencyMeta> = {
  "često": {
    label: "Često dolazi",
    shortLabel: "Često",
    iconClass: "text-destructive",
    badgeClass: "bg-destructive/15 text-destructive border-destructive/30",
  },
  "rijetko": {
    label: "Rijetko dolazi",
    shortLabel: "Rijetko",
    iconClass: "text-warning",
    badgeClass: "bg-warning/15 text-warning border-warning/30",
  },
  "nikad": {
    label: "Gotovo nikad",
    shortLabel: "Nikad",
    iconClass: "text-muted-foreground/70",
    badgeClass: "bg-secondary text-muted-foreground border-border",
  },
};

const UNSET_META: FrequencyMeta = {
  label: "Bez oznake",
  shortLabel: "—",
  iconClass: "text-muted-foreground/40",
  badgeClass: "bg-transparent text-muted-foreground border-border",
};

export function getFrequencyMeta(value: FrequencyTag | undefined | null): FrequencyMeta {
  if (!value) return UNSET_META;
  return META[value];
}

export const FREQUENCY_VALUES: readonly FrequencyTag[] = ["često", "rijetko", "nikad"] as const;
