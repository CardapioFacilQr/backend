import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MenusService } from '../menus/menus.service.js';
import type { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import type { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import { MenuItem } from './entities/menu-item.entity.js';

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem) private readonly items: Repository<MenuItem>,
    private readonly menus: MenusService,
  ) {}

  async findAll(menuId: string, ownerId: string): Promise<MenuItem[]> {
    await this.menus.findOwned(menuId, ownerId);
    return this.items.find({
      where: { menuId },
      order: { category: 'ASC', position: 'ASC' },
    });
  }

  async create(
    menuId: string,
    ownerId: string,
    dto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    await this.menus.findOwned(menuId, ownerId);
    return this.items.save(this.items.create({ ...dto, menuId }));
  }

  async update(
    menuId: string,
    itemId: string,
    ownerId: string,
    dto: UpdateMenuItemDto,
  ) {
    const item = await this.findOwnedItem(menuId, itemId, ownerId);
    return this.items.save(this.items.merge(item, dto));
  }

  async remove(menuId: string, itemId: string, ownerId: string): Promise<void> {
    await this.items.remove(await this.findOwnedItem(menuId, itemId, ownerId));
  }

  private async findOwnedItem(
    menuId: string,
    itemId: string,
    ownerId: string,
  ): Promise<MenuItem> {
    await this.menus.findOwned(menuId, ownerId);
    const item = await this.items.findOneBy({ id: itemId, menuId });
    if (!item) throw new NotFoundException('Item não encontrado');
    return item;
  }
}
