import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Pasta com o build do frontend (copiado para dentro da imagem, se existir). */
export const PUBLIC_DIR = join(process.cwd(), 'public');
export const SPA_INDEX_FILE = join(PUBLIC_DIR, 'index.html');

export const hasSpaBuild = (): boolean => existsSync(SPA_INDEX_FILE);
