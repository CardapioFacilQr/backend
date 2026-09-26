import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { randomSlug } from '../common/utils/slug.js';
import type { AppConfig } from '../config/configuration.js';
import { QrcodeService } from '../qrcode/qrcode.service.js';
import { RestaurantsService } from '../restaurants/restaurants.service.js';
import type { CreateMenuDto } from './dto/create-menu.dto.js';
import type { UpdateMenuDto } from './dto/update-menu.dto.js';
import { Menu, MenuSourceType } from './entities/menu.entity.js';
import { contentMatchesMimeType, removeUploadedFile } from './menu-upload.js';

@Injectable()
export class MenusService {
  private readonly uploadDir: string;
  private readonly publicBaseUrl: string;

  constructor(
    @InjectRepository(Menu) private readonly menus: Repository<Menu>,
    private readonly restaurants: RestaurantsService,
    private readonly qrcode: QrcodeService,
    config: ConfigService<AppConfig, true>,
  ) {
    this.uploadDir = config.get('upload', { infer: true }).dir;
    this.publicBaseUrl = config.get('publicBaseUrl', { infer: true });
  }

  async create(
    ownerId: string,
    dto: CreateMenuDto,
    file?: Express.Multer.File,
  ) {
    try {
      const restaurant = dto.restaurantId
        ? await this.restaurants.findOwned(dto.restaurantId, ownerId)
        : await this.restaurants.findFirstByOwner(ownerId);
      if (!restaurant) {
        throw new BadRequestException(
          'Cadastre um restaurante antes de criar um cardápio',
        );
      }

      const menu = this.menus.create({
        restaurantId: restaurant.id,
        title: dto.title,
        publicSlug: await this.generatePublicSlug(),
        ...(await this.fileFields(file)),
      });
      return this.toResponse(await this.menus.save(menu));
    } catch (err) {
      if (file) await removeUploadedFile(this.uploadDir, file.filename);
      throw err;
    }
  }

  async findAllByOwner(ownerId: string) {
    const menus = await this.menus.find({
      where: { restaurant: { ownerId } },
      order: { createdAt: 'DESC' },
    });
    return menus.map((menu) => this.toResponse(menu));
  }

  async findOne(id: string, ownerId: string) {
    return this.toResponse(await this.findOwned(id, ownerId));
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdateMenuDto,
    file?: Express.Multer.File,
  ) {
    try {
      const menu = await this.findOwned(id, ownerId);
      if (dto.restaurantId && dto.restaurantId !== menu.restaurantId) {
        await this.restaurants.findOwned(dto.restaurantId, ownerId);
        menu.restaurantId = dto.restaurantId;
      }
      if (dto.title !== undefined) menu.title = dto.title;

      const previousFile = menu.fileUrl;
      if (file) Object.assign(menu, await this.fileFields(file));

      const saved = await this.menus.save(menu);
      if (file && previousFile)
        await removeUploadedFile(this.uploadDir, previousFile);
      return this.toResponse(saved);
    } catch (err) {
      if (file) await removeUploadedFile(this.uploadDir, file.filename);
      throw err;
    }
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const menu = await this.findOwned(id, ownerId);
    await this.menus.remove(menu);
    await removeUploadedFile(this.uploadDir, menu.fileUrl);
  }

  /** Carrega o menu verificando se o usuário logado é o dono do restaurante. */
  async findOwned(id: string, ownerId: string): Promise<Menu> {
    const menu = await this.menus.findOne({
      where: { id },
      relations: { restaurant: true },
    });
    if (!menu) throw new NotFoundException('Cardápio não encontrado');
    if (menu.restaurant.ownerId !== ownerId) {
      throw new ForbiddenException('Você não é o dono deste cardápio');
    }
    return menu;
  }

  async findPublic(publicSlug: string) {
    const menu = await this.menus.findOne({
      where: { publicSlug },
      relations: { restaurant: true, items: true },
      order: { items: { category: 'ASC', position: 'ASC' } },
    });
    if (!menu) throw new NotFoundException('Cardápio não encontrado');

    return {
      title: menu.title,
      publicSlug: menu.publicSlug,
      sourceType: menu.sourceType,
      fileUrl: this.absoluteUrl(menu.fileUrl),
      fileMimeType: menu.fileMimeType,
      restaurant: { name: menu.restaurant.name, slug: menu.restaurant.slug },
      items: menu.items.map(({ menuId: _menuId, ...item }) => item),
      updatedAt: menu.updatedAt,
    };
  }

  private async fileFields(file?: Express.Multer.File) {
    if (!file) {
      return {
        sourceType: MenuSourceType.MANUAL,
        fileUrl: null,
        fileMimeType: null,
      };
    }
    if (!(await contentMatchesMimeType(file.path, file.mimetype))) {
      throw new BadRequestException(
        'O conteúdo do arquivo não corresponde ao tipo informado',
      );
    }
    return {
      sourceType:
        file.mimetype === 'application/pdf'
          ? MenuSourceType.PDF
          : MenuSourceType.IMAGE,
      fileUrl: `/uploads/${file.filename}`,
      fileMimeType: file.mimetype,
    };
  }

  private async generatePublicSlug(): Promise<string> {
    let slug = randomSlug();
    while (await this.menus.existsBy({ publicSlug: slug })) slug = randomSlug();
    return slug;
  }

  private absoluteUrl(path: string | null): string | null {
    return path ? `${this.publicBaseUrl}${path}` : null;
  }

  private toResponse(menu: Menu) {
    const { restaurant: _restaurant, items: _items, ...data } = menu;
    return {
      ...data,
      fileUrl: this.absoluteUrl(menu.fileUrl),
      publicUrl: this.qrcode.menuPublicUrl(menu.publicSlug),
      qrCodeUrl: `${this.publicBaseUrl}/api/public/menus/${menu.publicSlug}/qrcode`,
    };
  }
}
