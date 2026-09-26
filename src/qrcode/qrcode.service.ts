import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import QRCode from 'qrcode';
import type { AppConfig } from '../config/configuration.js';

export type QrCodeFormat = 'png' | 'svg';

export interface QrCodeImage {
  data: Buffer;
  contentType: string;
}

@Injectable()
export class QrcodeService {
  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  /** URL pública que o QR Code aponta: ${FRONTEND_URL}/m/${publicSlug} */
  menuPublicUrl(publicSlug: string): string {
    return `${this.config.get('frontendUrl', { infer: true })}/m/${publicSlug}`;
  }

  async generate(
    text: string,
    format: QrCodeFormat,
    size = 512,
  ): Promise<QrCodeImage> {
    const options = {
      margin: 2,
      width: size,
      errorCorrectionLevel: 'M' as const,
    };

    if (format === 'svg') {
      const svg = await QRCode.toString(text, { ...options, type: 'svg' });
      return { data: Buffer.from(svg, 'utf8'), contentType: 'image/svg+xml' };
    }

    const png = await QRCode.toBuffer(text, { ...options, type: 'png' });
    return { data: png, contentType: 'image/png' };
  }
}
