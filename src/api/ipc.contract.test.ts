import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Neither typechecker sees the IPC boundary: a renamed command compiles on both sides and dies at runtime
// with "Command <name> could not be found". This test is the only thing checking the two halves agree.

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap(entry => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const invokedCommands = (): Set<string> => {
  const names = new Set<string>();

  for (const file of walk('src').filter(f => /\.tsx?$/.test(f) && !f.endsWith('.test.ts'))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/invoke(?:<[^>]*>)?\(\s*'([a-z_]+)'/g)) {
      if (match[1]) names.add(match[1]);
    }
  }

  return names;
};

const registeredCommands = (): Set<string> => {
  const source = readFileSync('src-tauri/src/lib.rs', 'utf8');
  const handler = source.match(/generate_handler!\[([\s\S]*?)\]/)?.[1];
  if (!handler) throw new Error('No generate_handler! block found in lib.rs');

  return new Set(
    handler
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
  );
};

describe('Tauri IPC contract', () => {
  it('every command the frontend invokes is registered in lib.rs', () => {
    const registered = registeredCommands();
    const missing = [...invokedCommands()].filter(name => !registered.has(name));

    expect(missing).toEqual([]);
  });

  it('finds the commands at all (guards against the regexes silently matching nothing)', () => {
    expect(invokedCommands().size).toBeGreaterThan(0);
    expect(registeredCommands()).toContain('brainerd_api');
  });
});
