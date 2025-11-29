import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSettingsToUser1764431522623 implements MigrationInterface {
  name = 'AddAiSettingsToUser1764431522623';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "ai_settings" jsonb NOT NULL DEFAULT '{"tone":"friendly"}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ai_settings"`);
  }
}
