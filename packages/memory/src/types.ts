export interface MemoryEntry {
  key: string;
  content: string;
  updatedAt: number;
  layer?: MemoryLayer;
}

export type MemoryLayer = "profile" | "project" | "operational" | "journal";

export interface SearchResult {
  source: string;
  sourceType: "memory" | "profile" | "project" | "operational" | "journal";
  content: string;
  lineStart: number;
  lineEnd: number;
  score: number;
  vectorScore?: number;
  updatedAt: number;
}

export interface SearchOptions {
  maxResults?: number;
  sourceType?: "memory" | "profile" | "project" | "operational" | "journal" | "all";
}

export type EmbedFn = (texts: string[]) => Promise<{ vectors: number[][]; dimensions: number }>;

export interface EmbeddingConfig {
  embed: EmbedFn;
  provider: string;
  model: string;
}
