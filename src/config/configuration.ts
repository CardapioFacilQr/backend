import { readFileSync } from 'node:fs';
import type { JwtSignOptions } from '@nestjs/jwt';

/**
 * Lê `NAME` do ambiente ou, se existir `NAME_FILE`, o conteúdo desse arquivo.
 * Permite usar Docker secrets (montados em /run/secrets/*) sem expor o valor em env.
 */
function envOrFile(name: string): string | undefined {
  const file = process.env[`${name}_FILE`];
  if (file) return readFileSync(file, 'utf8').trim();
  return process.env[name];
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export default function configuration() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const isProduction = nodeEnv === 'production';
  const port = toInt(process.env.PORT, 3000);

  const jwtSecret = envOrFile('JWT_SECRET');
  if (!jwtSecret && isProduction) {
    throw new Error(
      'JWT_SECRET (ou JWT_SECRET_FILE) é obrigatório em produção',
    );
  }

  const expiresIn = process.env.JWT_EXPIRES_IN ?? '1d';
  const publicBaseUrl = (
    process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`
  ).replace(/\/+$/, '');

  return {
    nodeEnv,
    isProduction,
    port,
    /** Onde a API responde (usada nas URLs dos arquivos enviados). */
    publicBaseUrl,
    /** Onde o frontend responde: destino do QR Code. Sem ela, o QR aponta para a própria API. */
    frontendUrl: (process.env.FRONTEND_URL || publicBaseUrl).replace(
      /\/+$/,
      '',
    ),
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
    upload: {
      dir:
        process.env.UPLOAD_DIR ?? (isProduction ? '/app/uploads' : './uploads'),
      maxMb: toInt(process.env.MAX_UPLOAD_MB, 10),
    },
    db: {
      host: process.env.DB_HOST ?? 'localhost',
      port: toInt(process.env.DB_PORT, 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: envOrFile('DB_PASSWORD') ?? '',
      name: process.env.DB_NAME ?? 'cardapio',
      synchronize: toBool(process.env.DB_SYNCHRONIZE, false),
      retryAttempts: toInt(process.env.DB_RETRY_ATTEMPTS, 10),
      retryDelayMs: toInt(process.env.DB_RETRY_DELAY_MS, 3000),
    },
    jwt: {
      secret: jwtSecret ?? 'dev-only-insecure-secret',
      // Número puro = segundos; texto = formato do pacote "ms" (ex.: 1d, 12h).
      expiresIn: (/^\d+$/.test(expiresIn)
        ? Number(expiresIn)
        : expiresIn) as JwtSignOptions['expiresIn'],
    },
  };
}

export type AppConfig = ReturnType<typeof configuration>;
