import { describe, expect, test } from "vitest";
import {
  PROVIDER_TYPES,
  getProviderDeletionBlockReason,
} from "../packages/cli/src/config/ProviderManager";

describe("ProviderManager presets", () => {
  test("use unique ids for selectable provider types", () => {
    const ids = PROVIDER_TYPES.map((provider) => provider.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("do not expose openai-compatible providers in the add menu", () => {
    expect(PROVIDER_TYPES.some((provider) => provider.type === "openai-compat")).toBe(false);
  });

  test("explains why a provider cannot be deleted while models reference it", () => {
    const reason = getProviderDeletionBlockReason(
      {
        models: [
          { name: "primary", provider: "minimax", model: "MiniMax-M1" },
          { name: "embedding", provider: "minimax", model: "MiniMax-Embed", type: "embedding" },
        ],
      },
      "minimax",
    );

    expect(reason).toBe(
      'Can\'t delete "minimax" while models still use it: primary, embedding. Delete or reassign those models first.',
    );
  });

  test("allows deleting a provider when no models reference it", () => {
    const reason = getProviderDeletionBlockReason(
      {
        models: [{ name: "primary", provider: "anthropic", model: "claude-sonnet-4-5-20250514" }],
      },
      "minimax",
    );

    expect(reason).toBeNull();
  });
});
