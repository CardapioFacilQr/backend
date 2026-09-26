import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenusModule } from '../menus/menus.module.js';
import { MenuItem } from './entities/menu-item.entity.js';
import { MenuItemsController } from './menu-items.controller.js';
import { MenuItemsService } from './menu-items.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem]), MenusModule],
  controllers: [MenuItemsController],
  providers: [MenuItemsService],
})
export class MenuItemsModule {}
