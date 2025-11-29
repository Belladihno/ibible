import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSettingsToUser1764431522623 implements MigrationInterface {
  name = 'AddAiSettingsToUser1764431522623';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the column already exists to avoid duplicate column errors
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'ai_settings'
    `);

    if (columnExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "ai_settings" jsonb NOT NULL DEFAULT '{"tone":"friendly"}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if the column exists before dropping it
    const columnExists = await queryRunner.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'ai_settings'
    `);

    if (columnExists.length > 0) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ai_settings"`);
    }
  }
}
