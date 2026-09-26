import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/interfaces/auth-user.interface.js';
import { QrcodeService } from '../qrcode/qrcode.service.js';
import { CreateMenuDto } from './dto/create-menu.dto.js';
import { QrCodeQueryDto } from './dto/qrcode-query.dto.js';
import { UpdateMenuDto } from './dto/update-menu.dto.js';
import { MenusService } from './menus.service.js';

const menuMultipartSchema = (required: string[]) => ({
  schema: {
    type: 'object',
    required,
    properties: {
      title: { type: 'string' },
      restaurantId: { type: 'string', format: 'uuid' },
      file: {
        type: 'string',
        format: 'binary',
        description: 'JPEG, PNG, WEBP ou PDF',
      },
    },
  },
});

@ApiTags('menus')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menus')
export class MenusController {
  constructor(
    private readonly menus: MenusService,
    private readonly qrcode: QrcodeService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody(menuMultipartSchema(['title']))
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateMenuDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.menus.create(user.id, dto, file);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.menus.findAllByOwner(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.menus.findOne(id, user.id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody(menuMultipartSchema([]))
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.menus.update(id, user.id, dto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.menus.remove(id, user.id);
  }

  @Get(':id/qrcode')
  @ApiProduces('image/png', 'image/svg+xml')
  async qrCode(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: QrCodeQueryDto,
  ) {
    const menu = await this.menus.findOwned(id, user.id);
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
