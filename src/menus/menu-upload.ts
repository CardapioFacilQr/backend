import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { diskStorage } from 'multer';

/** Tipos aceitos -> extensão usada no nome salvo em disco. */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export function buildMulterOptions(
  uploadDir: string,
  maxMb: number,
): MulterOptions {
  mkdirSync(uploadDir, { recursive: true });

  return {
    storage: diskStorage({
      destination: uploadDir,
      // Nome sempre gerado (uuid + extensão pelo mimetype). O nome original nunca é usado.
      filename: (_req, file, cb) =>
        cb(null, `${randomUUID()}.${ALLOWED_MIME_TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype in ALLOWED_MIME_TYPES) return cb(null, true);
      cb(
        new BadRequestException(
          `Tipo de arquivo não permitido. Aceitos: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
        ),
        false,
      );
    },
  };
}

/**
 * O mimetype vem do cliente e pode ser falsificado; conferimos a assinatura
 * (magic bytes) do arquivo salvo para garantir que o conteúdo bate com o tipo.
 */
export async function contentMatchesMimeType(
  path: string,
  mimetype: string,
): Promise<boolean> {
  const handle = await open(path, 'r');
  try {
    const header = Buffer.alloc(12);
    await handle.read(header, 0, 12, 0);
    switch (mimetype) {
      case 'image/jpeg':
        return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
      case 'image/png':
        return header
          .subarray(0, 8)
          .equals(
            Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
          );
      case 'image/webp':
        return (
          header.toString('ascii', 0, 4) === 'RIFF' &&
          header.toString('ascii', 8, 12) === 'WEBP'
        );
      case 'application/pdf':
        return header.toString('ascii', 0, 5) === '%PDF-';
      default:
        return false;
    }
  } finally {
    await handle.close();
  }
}

/** Remove um arquivo enviado a partir da URL relativa salva (/uploads/<nome>). */
export async function removeUploadedFile(
  uploadDir: string,
  fileUrl: string | null | undefined,
): Promise<void> {
  if (!fileUrl) return;
  // basename impede path traversal mesmo se o valor salvo for adulterado.
  await unlink(join(uploadDir, basename(fileUrl))).catch(() => undefined);
}
