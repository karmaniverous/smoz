export type ConflictPolicy = 'overwrite' | 'example' | 'skip' | 'ask';

export type InitOptions = {
  install?: string | boolean;
  yes?: boolean;
  cli?: boolean;
  noInstall?: boolean;
  conflict?: string;
  dryRun?: boolean;
};

export type InitResult = {
  created: string[];
  skipped: string[];
  examples: string[];
  merged: string[];
  installed:
    | 'skipped'
    | 'ran (npm)'
    | 'ran (pnpm)'
    | 'ran (yarn)'
    | 'ran (bun)'
    | 'unknown-pm'
    | 'failed';
};

export type JsonObject = Record<string, unknown>;
