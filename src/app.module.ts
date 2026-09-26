import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ServeStaticModule,
  type ServeStaticModuleOptions,
} from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { resolve } from 'node:path';
import { AuthModule } from './auth/auth.module.js';
import { hasSpaBuild, PUBLIC_DIR } from './common/spa.js';
import configuration, { type AppConfig } from './config/configuration.js';
import { HealthModule } from './health/health.module.js';
import { MenuItemsModule } from './menu-items/menu-items.module.js';
import { MenusModule } from './menus/menus.module.js';
import { InitialSchema1790416800000 } from './migrations/1790416800000-InitialSchema.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const db = config.get('db', { infer: true });
        return {
          type: 'postgres',
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.name,
          autoLoadEntities: true,
          synchronize: db.synchronize,
          // Produção: as tabelas são criadas/atualizadas pelas migrations ao iniciar.
          // (Com synchronize ligado, em dev, as migrations não rodam para não conflitar.)
          migrations: [InitialSchema1790416800000],
          migrationsRun: !db.synchronize,
          // No Swarm não existe depends_on: a app fica tentando até o banco subir.
          retryAttempts: db.retryAttempts,
          retryDelay: db.retryDelayMs,
        };
      },
    }),

    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const options: ServeStaticModuleOptions[] = [
          {
            rootPath: resolve(config.get('upload', { infer: true }).dir),
            serveRoot: '/uploads',
            serveStaticOptions: {
              index: false,
              dotfiles: 'deny',
              maxAge: '7d',
              setHeaders: (res: {
                setHeader(name: string, value: string): void;
              }) => res.setHeader('X-Content-Type-Options', 'nosniff'),
            },
          },
        ];

        // Build do frontend (SPA) em public/: serve os assets e faz fallback
        // para index.html, sem capturar /api, /uploads e /m.
        if (hasSpaBuild()) {
          options.push({
            rootPath: PUBLIC_DIR,
            exclude: /^\/(api|uploads|m)(\/|$)/,
          });
        }
        return options;
      },
    }),

    HealthModule,
    UsersModule,
    AuthModule,
    RestaurantsModule,
    MenusModule,
    MenuItemsModule,
  ],
})
export class AppModule {}
