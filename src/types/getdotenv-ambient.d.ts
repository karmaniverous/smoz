// Ambient declaration for the get-dotenv host until full types are wired.
// Keeps TypeScript happy for dynamic imports in the CLI entry without using `any`.
declare module '@karmaniverous/get-dotenv' {
  export function buildSpawnEnv(
    base: Record<string, string | undefined>,
    overrides?: Record<string, unknown>,
  ): NodeJS.ProcessEnv;
}
