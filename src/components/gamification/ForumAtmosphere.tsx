import { memo, useMemo } from "react";

interface Props {
  /** 0-1: 0=midnight, 0.5=noon */
  dayPhase: number;
  /** 0-1: learning activity warmth */
  warmth: number;
}

/**
 * Full-screen ambient gradient that reflects time-of-day and learning velocity.
 * Also sets CSS custom properties so child components can react to the atmosphere.
 */
export const ForumAtmosphere = memo(function ForumAtmosphere({ dayPhase, warmth }: Props) {
  const sunArc = Math.sin(dayPhase * Math.PI);

  const gradient = useMemo(() => {
    const hue = 230 - sunArc * 190 * warmth;
    const saturation = 10 + sunArc * 25 + warmth * 15;
    const lightnessTop = 5 + sunArc * 4;
    const lightnessBottom = 8 + sunArc * 6;
    const opacity = 0.4 + sunArc * 0.2;

    return {
      background: `linear-gradient(
        180deg,
        hsla(${hue}, ${saturation}%, ${lightnessTop}%, ${opacity}) 0%,
        hsla(${hue + 10}, ${saturation - 5}%, ${lightnessBottom}%, ${opacity * 0.6}) 100%
      )`,
    };
  }, [sunArc, warmth]);

  const glowOpacity = useMemo(() => {
    const isTransition = 1 - Math.abs(sunArc - 0.5) * 2;
    return isTransition * warmth * 0.3;
  }, [sunArc, warmth]);

  // Atmospheric tint color for buildings — warm golden during day, cool blue at night
  const tintHue = 230 - sunArc * 190 * warmth;
  const tintSat = 15 + warmth * 20;
  const tintLight = 50 + sunArc * 15;
  const tintOpacity = 0.06 + sunArc * 0.08 + warmth * 0.04;

  return (
    <>
      {/* CSS custom properties for child components */}
      <div
        className="hidden"
        aria-hidden
        style={{
          // @ts-ignore — setting CSS vars on root
        }}
      />
      <style>{`
        .forum-atmosphere-root {
          --atmo-tint: hsla(${tintHue}, ${tintSat}%, ${tintLight}%, ${tintOpacity});
          --atmo-glow: ${glowOpacity};
          --atmo-sun: ${sunArc.toFixed(3)};
          --atmo-warmth: ${warmth.toFixed(3)};
        }
      `}</style>

      {/* Ambient sky gradient */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-1000"
        style={gradient}
        aria-hidden
      />
      {/* Golden horizon glow */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-0 h-48 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(ellipse 120% 100% at 50% 100%, hsl(var(--gold) / ${glowOpacity}), transparent 70%)`,
        }}
        aria-hidden
      />
    </>
  );
});
