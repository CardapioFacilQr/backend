import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';
import { MenuItem } from '../../menu-items/entities/menu-item.entity.js';
import { Restaurant } from '../../restaurants/entities/restaurant.entity.js';

export enum MenuSourceType {
  IMAGE = 'image',
  PDF = 'pdf',
  MANUAL = 'manual',
}

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column('uuid')
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Relation<Restaurant>;

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'enum', enum: MenuSourceType })
  sourceType: MenuSourceType;

  /** Caminho relativo do arquivo servido, ex.: /uploads/<uuid>.pdf */
  @Column({ type: 'varchar', length: 255, nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fileMimeType: string | null;

  /** Slug curto e aleatório usado na URL pública (/m/:publicSlug). O QR Code é gerado sob demanda. */
  @Index({ unique: true })
  @Column({ length: 32 })
  publicSlug: string;

  @OneToMany(() => MenuItem, (item) => item.menu)
  items: Relation<MenuItem[]>;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
