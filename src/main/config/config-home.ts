import { join } from 'node:path';

export function configHome(): string {
  return process.env.XDG_CONFIG_HOME || join(process.env.HOME ?? process.cwd(), '.config');
}
