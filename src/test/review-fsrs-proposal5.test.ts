import { describe, it, expect } from "vitest";
import { DEFAULT_SR_SETTINGS } from "@/lib/spaced-repetition";
import {
  KNOWLEDGE_PROFILE_PRESETS,
  resolveEffectiveSrParams,
} from "@/domains/subjects/subject-settings";

describe("knowledge profile presets", () => {
  it("applies memory preset via resolveEffectiveSrParams when saved", async () => {
    const { saveSubjectSettings, clearSubjectSettings } = await import(
      "@/domains/subjects/subject-settings"
    );
    const catId = "test-cat-fsrs-profile";
    await clearSubjectSettings(catId);
    await saveSubjectSettings(catId, {
      knowledgeProfile: "memory",
      ...KNOWLEDGE_PROFILE_PRESETS.memory,
    });

    const { targetRetention, srSettings } = resolveEffectiveSrParams(
      catId,
      DEFAULT_SR_SETTINGS,
    );
    expect(targetRetention).toBe(0.93);
    expect(srSettings.leechThreshold).toBe(4);

    await clearSubjectSettings(catId);
  });
});
