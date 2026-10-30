import { promises as fs } from "fs";
import path from "path";

// Tiny JSON-file persistence used by every admin store (bookings, fleet, fares,
// journal). Works on any Node host (VPS, PM2, Docker). On serverless platforms
// the filesystem is ephemeral — swap this module for a database first (see README).

export const DATA_DIR = path.join(process.cwd(), "data");

// One write queue per file, shared across module copies (Next can load a module
// more than once — pages, actions and route handlers are bundled separately).
const queues: Map<string, Promise<unknown>> = ((globalThis as Record<string, unknown>).__dcQueues ??= new Map()) as Map<
  string,
  Promise<unknown>
>;

export function jsonFile<T>(name: string, fallback: () => T) {
  const file = path.join(DATA_DIR, name);

  async function read(): Promise<T> {
    try {
      return JSON.parse(await fs.readFile(file, "utf8")) as T;
    } catch (err) {
      // Missing file = nothing saved yet. A corrupt file must NOT read as empty,
      // or the next write would silently wipe the data.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback();
      throw err;
    }
  }

  async function write(data: T): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Write-then-rename so a crash mid-write never leaves a truncated file.
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, file);
  }

  // Serialised read-modify-write: `fn` edits the data in place (or returns
  // `{ replace }` to swap it wholesale) and the result is saved atomically.
  function mutate<R>(fn: (data: T) => R | Promise<R>): Promise<R> {
    const prev = queues.get(file) ?? Promise.resolve();
    const run = prev.then(async () => {
      const data = await read();
      const result = await fn(data);
      await write(data);
      return result;
    });
    queues.set(
      file,
      run.catch(() => {}),
    );
    return run;
  }

  function replace(next: T): Promise<void> {
    const prev = queues.get(file) ?? Promise.resolve();
    const run = prev.then(() => write(next));
    queues.set(
      file,
      run.catch(() => {}),
    );
    return run;
  }

  return { read, mutate, replace };
}
