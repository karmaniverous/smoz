import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

const EXCLUDED_TEMPLATE_DIRECTORIES = new Set(['.git', 'node_modules']);

export const writeIfAbsent = async (
  outFile: string,
  content: string,
): Promise<{ created: boolean }> => {
  if (existsSync(outFile)) return { created: false };
  await fs.mkdir(dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, content, 'utf8');
  return { created: true };
};

export const walk = async (
  dir: string,
  out: string[] = [],
): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (EXCLUDED_TEMPLATE_DIRECTORIES.has(ent.name)) continue;
      await walk(p, out);
    } else if (ent.isFile()) {
      out.push(p);
    }
  }
  return out;
};

export const readJson = async <T = unknown>(
  file: string,
): Promise<T | undefined> => {
  try {
    const data = await fs.readFile(file, 'utf8');
    return JSON.parse(data) as T;
  } catch {
    return undefined;
  }
};

export const writeJson = async (file: string, obj: unknown): Promise<void> => {
  await fs.mkdir(dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(obj, null, 2), 'utf8');
};
