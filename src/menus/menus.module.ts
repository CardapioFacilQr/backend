import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { AppConfig } from '../config/configuration.js';
import { QrcodeModule } from '../qrcode/qrcode.module.js';
import { RestaurantsModule } from '../restaurants/restaurants.module.js';
import { Menu } from './entities/menu.entity.js';
import { buildMulterOptions } from './menu-upload.js';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';
import { PublicMenusController } from './public-menus.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Menu]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const upload = config.get('upload', { infer: true });
        return buildMulterOptions(upload.dir, upload.maxMb);
      },
    }),
    RestaurantsModule,
    QrcodeModule,
  ],
  controllers: [MenusController, PublicMenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
