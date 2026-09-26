import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { randomSlug, slugify } from '../common/utils/slug.js';
import { Restaurant } from './entities/restaurant.entity.js';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurants: Repository<Restaurant>,
  ) {}

  async create(ownerId: string, name: string): Promise<Restaurant> {
    const base = slugify(name);
    let slug = base;
    while (await this.restaurants.existsBy({ slug })) {
      slug = `${base}-${randomSlug(3).toLowerCase()}`;
    }
    return this.restaurants.save(
      this.restaurants.create({ ownerId, name, slug }),
    );
  }

  findAllByOwner(ownerId: string): Promise<Restaurant[]> {
    return this.restaurants.find({
      where: { ownerId },
      order: { createdAt: 'ASC' },
    });
  }

  findFirstByOwner(ownerId: string): Promise<Restaurant | null> {
    return this.restaurants.findOne({
      where: { ownerId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOwned(id: string, ownerId: string): Promise<Restaurant> {
    const restaurant = await this.restaurants.findOneBy({ id });
    if (!restaurant) throw new NotFoundException('Restaurante não encontrado');
    if (restaurant.ownerId !== ownerId) {
      throw new ForbiddenException('Você não é o dono deste restaurante');
    }
    return restaurant;
  }
}
