import { memo, useMemo } from "react";

interface Props {
  /** 0-1: 0=midnight, 0.5=noon */
  dayPhase: number;
  /** 0-1: learning activity warmth */
  warmth: number;
}

/**
 * Full-screen ambient gradient that reflects time-of-day and learning velocity.
 * Sits behind the monument grid as a subtle atmospheric layer.
 */
export const ForumAtmosphere = memo(function ForumAtmosphere({ dayPhase, warmth }: Props) {
  const gradient = useMemo(() => {
    // Map dayPhase to a sun arc: 0=night, 0.5=noon, 1=night
    const sunArc = Math.sin(dayPhase * Math.PI); // 0→1→0

    // Base hue shifts: night=230 (deep blue), noon=40 (warm amber)
    const hue = 230 - sunArc * 190 * warmth; // cold when inactive, warm when active
    const saturation = 10 + sunArc * 25 + warmth * 15;
    const lightnessTop = 5 + sunArc * 4;
    const lightnessBottom = 8 + sunArc * 6;

    // Opacity of the atmospheric overlay
    const opacity = 0.4 + sunArc * 0.2;

    return {
      background: `linear-gradient(
        180deg,
        hsla(${hue}, ${saturation}%, ${lightnessTop}%, ${opacity}) 0%,
        hsla(${hue + 10}, ${saturation - 5}%, ${lightnessBottom}%, ${opacity * 0.6}) 100%
      )`,
    };
  }, [dayPhase, warmth]);

  // Gold accent glow at the horizon — intensity based on warmth
  const glowOpacity = useMemo(() => {
    const sunArc = Math.sin(dayPhase * Math.PI);
    // Strongest glow at sunrise/sunset (sunArc ~0.5) with high warmth
    const isTransition = 1 - Math.abs(sunArc - 0.5) * 2;
    return isTransition * warmth * 0.3;
  }, [dayPhase, warmth]);

  return (
    <>
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
