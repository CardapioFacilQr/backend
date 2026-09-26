import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Cria o schema inicial: users, restaurants, menus e menu_items. */
export class InitialSchema1790416800000 implements MigrationInterface {
  name = 'InitialSchema1790416800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() é usado como default das chaves primárias.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "email" character varying(255) NOT NULL, "passwordHash" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email")`,
    );

    await queryRunner.query(
      `CREATE TABLE "restaurants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(150) NOT NULL, "slug" character varying(80) NOT NULL, "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e2133a72eb1cc8f588f7b503e68" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_afb6330c019768b4c3f9a65303" ON "restaurants" ("slug")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9519e81d388514ec631d23fefc" ON "restaurants" ("ownerId")`,
    );

    await queryRunner.query(
      `CREATE TABLE "menu_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "menuId" uuid NOT NULL, "name" character varying(150) NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "photoUrl" character varying(500), "category" character varying(80), "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_57e6188f929e5dc6919168620c8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a6b42bf45dbdef19cbf05a4cac" ON "menu_items" ("menuId")`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."menus_sourcetype_enum" AS ENUM('image', 'pdf', 'manual')`,
    );
    await queryRunner.query(
      `CREATE TABLE "menus" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "restaurantId" uuid NOT NULL, "title" character varying(150) NOT NULL, "sourceType" "public"."menus_sourcetype_enum" NOT NULL, "fileUrl" character varying(255), "fileMimeType" character varying(100), "publicSlug" character varying(32) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3fec3d93327f4538e0cbd4349c4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_62f6422b138b02c889426a1bf4" ON "menus" ("restaurantId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_bfb882b2a8ad1823b69782b069" ON "menus" ("publicSlug")`,
    );

    await queryRunner.query(
      `ALTER TABLE "restaurants" ADD CONSTRAINT "FK_9519e81d388514ec631d23fefca" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD CONSTRAINT "FK_a6b42bf45dbdef19cbf05a4cacf" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "menus" ADD CONSTRAINT "FK_62f6422b138b02c889426a1bf47" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "menus" DROP CONSTRAINT "FK_62f6422b138b02c889426a1bf47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" DROP CONSTRAINT "FK_a6b42bf45dbdef19cbf05a4cacf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "restaurants" DROP CONSTRAINT "FK_9519e81d388514ec631d23fefca"`,
    );
    await queryRunner.query(`DROP TABLE "menus"`);
    await queryRunner.query(`DROP TYPE "public"."menus_sourcetype_enum"`);
    await queryRunner.query(`DROP TABLE "menu_items"`);
    await queryRunner.query(`DROP TABLE "restaurants"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
