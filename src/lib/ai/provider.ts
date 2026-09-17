export type AIProvider = { generateText(input: { prompt: string; tone?: string }): Promise<string> };
export const mockProvider: AIProvider = { async generateText({ prompt }) { return `Mock suggestion based on the available facts: ${prompt.slice(0, 180)}…`; } };
export function getAIProvider(): AIProvider { return mockProvider; }
