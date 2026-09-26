import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/interfaces/auth-user.interface.js';
import { CreateRestaurantDto } from './dto/create-restaurant.dto.js';
import { RestaurantsService } from './restaurants.service.js';

@ApiTags('restaurants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRestaurantDto) {
    return this.restaurants.create(user.id, dto.name);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.restaurants.findAllByOwner(user.id);
  }
}
