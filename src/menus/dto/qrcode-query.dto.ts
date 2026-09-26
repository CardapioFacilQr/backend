import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { QrCodeFormat } from '../../qrcode/qrcode.service.js';

export class QrCodeQueryDto {
  @ApiPropertyOptional({ enum: ['png', 'svg'], default: 'png' })
  @IsOptional()
  @IsIn(['png', 'svg'])
  format: QrCodeFormat = 'png';

  @ApiPropertyOptional({
    type: Boolean,
    default: false,
    description: 'Força o download do arquivo',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  download = false;

  @ApiPropertyOptional({
    default: 512,
    minimum: 128,
    maximum: 2048,
    description: 'Largura em pixels',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(128)
  @Max(2048)
  size = 512;
}
