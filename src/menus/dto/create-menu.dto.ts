import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateMenuDto {
  @ApiProperty({ example: 'Cardápio de Almoço' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 150)
  title: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Se omitido, usa o primeiro restaurante do usuário logado',
  })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}
