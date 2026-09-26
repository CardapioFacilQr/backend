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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/interfaces/auth-user.interface.js';
import { CreateMenuItemDto } from './dto/create-menu-item.dto.js';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto.js';
import { MenuItemsService } from './menu-items.service.js';

@ApiTags('menu-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('menus/:menuId/items')
export class MenuItemsController {
  constructor(private readonly items: MenuItemsService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Param('menuId', ParseUUIDPipe) menuId: string,
  ) {
    return this.items.findAll(menuId, user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    return this.items.create(menuId, user.id, dto);
  }

  @Patch(':itemId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.items.update(menuId, itemId, user.id, dto);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('menuId', ParseUUIDPipe) menuId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.items.remove(menuId, itemId, user.id);
  }
}
