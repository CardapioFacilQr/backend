import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { hasSpaBuild, SPA_INDEX_FILE } from '../common/spa.js';
import { QrcodeService } from '../qrcode/qrcode.service.js';
import { QrCodeQueryDto } from './dto/qrcode-query.dto.js';
import { MenusService } from './menus.service.js';

/** Rotas públicas (sem JWT) usadas por quem escaneia o QR Code. */
@ApiTags('public')
@Controller()
export class PublicMenusController {
  constructor(
    private readonly menus: MenusService,
    private readonly qrcode: QrcodeService,
  ) {}

  /**
   * Destino do QR Code (fora do prefixo /api).
   * - navegador + frontend buildado em public/: entrega o index.html (a SPA busca /api/public/menus/:slug)
   * - navegador sem frontend: redireciona direto para a imagem/PDF do cardápio
   * - demais clientes (fetch, curl): JSON com os dados do cardápio
   */
  @Get('m/:publicSlug')
  @ApiOperation({
    summary:
      'Página pública do cardápio (JSON, ou HTML/redirect para navegadores)',
  })
  async open(
    @Param('publicSlug') publicSlug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const wantsHtml = req.accepts(['json', 'html']) === 'html';
    if (wantsHtml && hasSpaBuild()) return res.sendFile(SPA_INDEX_FILE);

    const menu = await this.menus.findPublic(publicSlug);
    if (wantsHtml && menu.fileUrl) return res.redirect(302, menu.fileUrl);
    return res.json(menu);
  }

  @Get('public/menus/:publicSlug')
  @ApiOkResponse({ description: 'Dados públicos do cardápio' })
  findPublic(@Param('publicSlug') publicSlug: string) {
    return this.menus.findPublic(publicSlug);
  }

  @Get('public/menus/:publicSlug/qrcode')
  @ApiProduces('image/png', 'image/svg+xml')
  async publicQrCode(
    @Param('publicSlug') publicSlug: string,
    @Query() query: QrCodeQueryDto,
  ) {
    const menu = await this.menus.findPublic(publicSlug);
    const image = await this.qrcode.generate(
      this.qrcode.menuPublicUrl(menu.publicSlug),
      query.format,
      query.size,
    );
    return new StreamableFile(image.data, {
      type: image.contentType,
      disposition: query.download
        ? `attachment; filename="cardapio-${menu.publicSlug}.${query.format}"`
        : 'inline',
    });
  }
}
