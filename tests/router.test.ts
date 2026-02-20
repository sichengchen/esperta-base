import { describe, test, expect, beforeEach } from "bun:test";
import { ModelRouter } from "../src/engine/router/index.js";
import type { ModelRouterData } from "../src/engine/router/index.js";

const validConfig: ModelRouterData = {
  defaultModel: "sonnet",
  providers: [
    {
      id: "anthropic",
      type: "anthropic" as any,
      apiKeyEnvVar: "ANTHROPIC_API_KEY",
    },
    {
      id: "openai",
      type: "openai" as any,
      apiKeyEnvVar: "OPENAI_API_KEY",
    },
  ],
  models: [
    {
      name: "sonnet",
      provider: "anthropic",
      model: "claude-sonnet-4-5-20250514",
      temperature: 0.7,
      maxTokens: 4096,
    },
    {
      name: "gpt4o",
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.5,
    },
  ],
};

describe("ModelRouter", () => {
  describe("loading", () => {
    test("loads valid config", () => {
      const router = ModelRouter.fromConfig(validConfig);
      expect(router.listModels()).toEqual(["sonnet", "gpt4o"]);
      expect(router.getActiveModelName()).toBe("sonnet");
    });

    test("rejects empty models array", () => {
      expect(() =>
        ModelRouter.fromConfig({ ...validConfig, models: [] })
      ).toThrow("at least one model");
    });

    test("rejects empty providers array", () => {
      expect(() =>
        ModelRouter.fromConfig({ ...validConfig, providers: [] })
      ).toThrow("at least one provider");
    });

    test("rejects missing default", () => {
      expect(() =>
        ModelRouter.fromConfig({ ...validConfig, defaultModel: "" })
      ).toThrow("must specify a default");
    });

    test("rejects default not in models list", () => {
      expect(() =>
        ModelRouter.fromConfig({ ...validConfig, defaultModel: "missing" })
      ).toThrow("not found in models list");
    });

    test("rejects duplicate model names", () => {
      expect(() =>
        ModelRouter.fromConfig({
          ...validConfig,
          models: [
            { name: "a", provider: "anthropic", model: "gpt-4o" },
            { name: "a", provider: "anthropic", model: "claude-sonnet-4-5-20250514" },
          ],
          defaultModel: "a",
        })
      ).toThrow("Duplicate");
    });

    test("rejects model with unknown provider", () => {
      expect(() =>
        ModelRouter.fromConfig({
          defaultModel: "a",
          providers: [{ id: "p1", type: "anthropic" as any, apiKeyEnvVar: "X" }],
          models: [{ name: "a", provider: "unknown-provider", model: "m" }],
        })
      ).toThrow("unknown provider");
    });
  });

  describe("switching", () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = ModelRouter.fromConfig(validConfig);
    });

    test("switches to a valid model", () => {
      router.switchModel("gpt4o");
      expect(router.getActiveModelName()).toBe("gpt4o");
    });

    test("throws on unknown model", () => {
      expect(() => router.switchModel("nonexistent")).toThrow("not found");
    });
  });

  describe("getConfig", () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = ModelRouter.fromConfig(validConfig);
    });

    test("returns active model config", () => {
      const cfg = router.getConfig();
      expect(cfg.name).toBe("sonnet");
      expect(cfg.provider).toBe("anthropic");
    });

    test("returns named model config", () => {
      const cfg = router.getConfig("gpt4o");
      expect(cfg.name).toBe("gpt4o");
      expect(cfg.provider).toBe("openai");
    });

    test("throws on unknown name", () => {
      expect(() => router.getConfig("nope")).toThrow("not found");
    });
  });

  describe("getProvider", () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = ModelRouter.fromConfig(validConfig);
    });

    test("returns provider config by id", () => {
      const p = router.getProvider("anthropic");
      expect(p.id).toBe("anthropic");
      expect(p.type).toBe("anthropic");
      expect(p.apiKeyEnvVar).toBe("ANTHROPIC_API_KEY");
    });

    test("throws on unknown provider id", () => {
      expect(() => router.getProvider("nonexistent")).toThrow("not found");
    });
  });

  describe("CRUD — models", () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = ModelRouter.fromConfig(validConfig);
    });

    test("adds a new model", async () => {
      await router.addModel({
        name: "gemini",
        provider: "anthropic",
        model: "gemini-2.0-flash",
      });
      expect(router.listModels()).toContain("gemini");
    });

    test("rejects adding model with unknown provider", async () => {
      await expect(
        router.addModel({
          name: "new-model",
          provider: "unknown",
          model: "m",
        })
      ).rejects.toThrow("not found");
    });

    test("rejects adding duplicate name", async () => {
      await expect(
        router.addModel({
          name: "sonnet",
          provider: "anthropic",
          model: "claude-sonnet-4-5-20250514",
        })
      ).rejects.toThrow("already exists");
    });

    test("removes a model", async () => {
      await router.removeModel("gpt4o");
      expect(router.listModels()).not.toContain("gpt4o");
    });

    test("cannot remove default model", async () => {
      await expect(router.removeModel("sonnet")).rejects.toThrow(
        "Cannot remove the default"
      );
    });

    test("resets active to default when active model is removed", async () => {
      router.switchModel("gpt4o");
      await router.removeModel("gpt4o");
      expect(router.getActiveModelName()).toBe("sonnet");
    });
  });

  describe("CRUD — providers", () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = ModelRouter.fromConfig(validConfig);
    });

    test("lists providers", () => {
      const providers = router.listProviders();
      expect(providers.map((p) => p.id)).toContain("anthropic");
      expect(providers.map((p) => p.id)).toContain("openai");
    });

    test("adds a new provider", async () => {
      await router.addProvider({
        id: "google",
        type: "google" as any,
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
      });
      expect(router.listProviders().map((p) => p.id)).toContain("google");
    });

    test("rejects adding duplicate provider id", async () => {
      await expect(
        router.addProvider({
          id: "anthropic",
          type: "anthropic" as any,
          apiKeyEnvVar: "X",
        })
      ).rejects.toThrow("already exists");
    });

    test("removes a provider not referenced by any model", async () => {
      await router.addProvider({
        id: "google",
        type: "google" as any,
        apiKeyEnvVar: "GOOGLE_AI_API_KEY",
      });
      await router.removeProvider("google");
      expect(router.listProviders().map((p) => p.id)).not.toContain("google");
    });

    test("cannot remove provider referenced by a model", async () => {
      await expect(router.removeProvider("anthropic")).rejects.toThrow(
        "still referenced by model"
      );
    });
  });

  describe("getStreamOptions", () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = ModelRouter.fromConfig(validConfig);
    });

    test("throws when API key env var is not set", () => {
      const original = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      try {
        expect(() => router.getStreamOptions()).toThrow("API key not found");
      } finally {
        if (original) process.env.ANTHROPIC_API_KEY = original;
      }
    });

    test("returns options when API key is available", () => {
      const original = process.env.ANTHROPIC_API_KEY;
      process.env.ANTHROPIC_API_KEY = "test-key";
      try {
        const opts = router.getStreamOptions();
        expect(opts.apiKey).toBe("test-key");
        expect(opts.temperature).toBe(0.7);
        expect(opts.maxTokens).toBe(4096);
      } finally {
        if (original) {
          process.env.ANTHROPIC_API_KEY = original;
        } else {
          delete process.env.ANTHROPIC_API_KEY;
        }
      }
    });
  });
});
