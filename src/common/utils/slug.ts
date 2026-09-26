import { randomBytes } from 'node:crypto';

/** "Cantina da Nona!" -> "cantina-da-nona" */
export function slugify(text: string): string {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'restaurante';
}

/** Identificador curto, aleatório e seguro para URL (12 caracteres base64url). */
export function randomSlug(bytes = 9): string {
  return randomBytes(bytes).toString('base64url');
}
