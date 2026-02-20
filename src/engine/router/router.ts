import { getModel } from "@mariozechner/pi-ai";
import type { Model, Api } from "@mariozechner/pi-ai";
import type { ModelConfig, ProviderConfig } from "./types.js";
import type { SecretsFile } from "../config/types.js";

export interface ModelRouterData {
  providers: ProviderConfig[];
  models: ModelConfig[];
  defaultModel: string;
}

export class ModelRouter {
  private providers: ProviderConfig[];
  private models: ModelConfig[];
  private defaultModelName: string;
  private activeModelName: string;
  private secrets: SecretsFile | null;
  private onSave: (() => Promise<void>) | null;

  private constructor(
    data: ModelRouterData,
    secrets: SecretsFile | null,
    onSave: (() => Promise<void>) | null,
  ) {
    this.providers = [...data.providers];
    this.models = [...data.models];
    this.defaultModelName = data.defaultModel;
    this.activeModelName = data.defaultModel;
    this.secrets = secrets;
    this.onSave = onSave;
  }

  /** Create a ModelRouter from config data (no file I/O) */
  static fromConfig(
    data: ModelRouterData,
    secrets?: SecretsFile | null,
    onSave?: () => Promise<void>,
  ): ModelRouter {
    ModelRouter.validate(data);
    return new ModelRouter(data, secrets ?? null, onSave ?? null);
  }

  /** Validate model/provider configuration */
  private static validate(data: ModelRouterData): void {
    if (!data.providers || data.providers.length === 0) {
      throw new Error("Config must contain at least one provider");
    }
    if (!data.models || data.models.length === 0) {
      throw new Error("Config must contain at least one model");
    }
    if (!data.defaultModel) {
      throw new Error("Config must specify a default model");
    }
    const names = data.models.map((m) => m.name);
    if (!names.includes(data.defaultModel)) {
      throw new Error(
        `Default model "${data.defaultModel}" not found in models list`
      );
    }
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      throw new Error("Duplicate model names in config");
    }
    const providerIds = new Set(data.providers.map((p) => p.id));
    for (const model of data.models) {
      if (!providerIds.has(model.provider)) {
        throw new Error(
          `Model "${model.name}" references unknown provider "${model.provider}"`
        );
      }
    }
  }

  /** Resolve an API key: env var takes precedence, then secrets file. */
  private resolveApiKey(envVar: string): string {
    const fromEnv = process.env[envVar];
    if (fromEnv) return fromEnv;
    const fromSecrets = this.secrets?.apiKeys[envVar];
    if (fromSecrets) return fromSecrets;
    throw new Error(
      `API key not found: set environment variable "${envVar}" or run the setup wizard to store it in secrets.enc`
    );
  }

  /** Look up a ProviderConfig by ID */
  getProvider(id: string): ProviderConfig {
    const provider = this.providers.find((p) => p.id === id);
    if (!provider) {
      throw new Error(`Provider "${id}" not found`);
    }
    return provider;
  }

  /** Get the PI-mono Model object for the active (or named) config */
  getModel(name?: string): Model<Api> {
    const cfg = this.getConfig(name);
    const provider = this.getProvider(cfg.provider);
    const apiKey = this.resolveApiKey(provider.apiKeyEnvVar);
    if (provider.baseUrl) {
      return {
        id: cfg.model,
        name: cfg.model,
        api: "openai-completions" as const,
        provider: provider.type,
        baseUrl: provider.baseUrl,
        reasoning: false,
        input: ["text"] as ("text" | "image")[],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: cfg.maxTokens ?? 4096,
      } as Model<Api>;
    }
    return (getModel as (p: string, m: string) => Model<Api>)(
      provider.type,
      cfg.model
    );
  }

  /** Get the raw ModelConfig for the active (or named) model */
  getConfig(name?: string): ModelConfig {
    const target = name ?? this.activeModelName;
    const cfg = this.models.find((m) => m.name === target);
    if (!cfg) {
      throw new Error(`Model "${target}" not found`);
    }
    return cfg;
  }

  /** Get streaming options (temperature, maxTokens, apiKey) for the active (or named) model */
  getStreamOptions(name?: string): {
    temperature?: number;
    maxTokens?: number;
    apiKey: string;
  } {
    const cfg = this.getConfig(name);
    const provider = this.getProvider(cfg.provider);
    const apiKey = this.resolveApiKey(provider.apiKeyEnvVar);
    return {
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens,
      apiKey,
    };
  }

  /** List all configured model names */
  listModels(): string[] {
    return this.models.map((m) => m.name);
  }

  /** List all model configs */
  listModelConfigs(): ModelConfig[] {
    return [...this.models];
  }

  /** List all configured providers */
  listProviders(): ProviderConfig[] {
    return [...this.providers];
  }

  /** Get the currently active model name */
  getActiveModelName(): string {
    return this.activeModelName;
  }

  /** Switch the active model */
  switchModel(name: string): void {
    const exists = this.models.some((m) => m.name === name);
    if (!exists) {
      throw new Error(`Model "${name}" not found`);
    }
    this.activeModelName = name;
  }

  /** Add a new model configuration */
  async addModel(config: ModelConfig): Promise<void> {
    if (this.models.some((m) => m.name === config.name)) {
      throw new Error(`Model "${config.name}" already exists`);
    }
    if (!this.providers.some((p) => p.id === config.provider)) {
      throw new Error(`Provider "${config.provider}" not found`);
    }
    this.models.push(config);
    await this.save();
  }

  /** Remove a model configuration by name */
  async removeModel(name: string): Promise<void> {
    const idx = this.models.findIndex((m) => m.name === name);
    if (idx === -1) {
      throw new Error(`Model "${name}" not found`);
    }
    if (this.defaultModelName === name) {
      throw new Error(`Cannot remove the default model "${name}"`);
    }
    this.models.splice(idx, 1);
    if (this.activeModelName === name) {
      this.activeModelName = this.defaultModelName;
    }
    await this.save();
  }

  /** Add a new provider configuration */
  async addProvider(provider: ProviderConfig): Promise<void> {
    if (this.providers.some((p) => p.id === provider.id)) {
      throw new Error(`Provider "${provider.id}" already exists`);
    }
    this.providers.push(provider);
    await this.save();
  }

  /** Remove a provider configuration by ID */
  async removeProvider(id: string): Promise<void> {
    const idx = this.providers.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Provider "${id}" not found`);
    }
    const referencedBy = this.models.filter((m) => m.provider === id).map((m) => m.name);
    if (referencedBy.length > 0) {
      throw new Error(
        `Cannot remove provider "${id}" — still referenced by model(s): ${referencedBy.join(", ")}`
      );
    }
    this.providers.splice(idx, 1);
    await this.save();
  }

  private async save(): Promise<void> {
    if (this.onSave) {
      await this.onSave();
    }
  }
}
