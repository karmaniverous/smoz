// Ambient declaration for the get-dotenv host until full types are wired.
// Keeps TypeScript happy for dynamic imports in the CLI entry.
declare module '@karmaniverous/get-dotenv' {
  const anyExport: any;
  export = anyExport;
}
