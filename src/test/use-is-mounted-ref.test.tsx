import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsMountedRef } from "@/hooks/useIsMountedRef";

describe("useIsMountedRef (Phase C / P2-4)", () => {
  it("starts true, flips to false on unmount", () => {
    const { result, unmount } = renderHook(() => useIsMountedRef());
    expect(result.current.current).toBe(true);
    unmount();
    expect(result.current.current).toBe(false);
  });
});
