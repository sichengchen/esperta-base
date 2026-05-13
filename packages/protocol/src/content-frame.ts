/**
 * Wrap untrusted external content in data-source tags so model prompts can
 * preserve source boundaries.
 */
export function frameAsData(content: string, source: string): string {
  const escaped = content.replace(/<\/data-/g, "&lt;/data-");
  return `<data-${source}>\n${escaped}\n</data-${source}>`;
}
