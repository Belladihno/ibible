import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReadingLog20251124120200 implements MigrationInterface {
  name = 'CreateReadingLog20251124120200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "reading_log" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" text,
      "bibleId" text DEFAULT 'de4e12af7f28f599-02',
      "book" text,
      "chapter" text,
      "verse" text,
      "version" text,
      "timestamp" text,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_reading_log_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reading_log_bibleId" ON "reading_log" ("bibleId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_reading_log_userId" ON "reading_log" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reading_log_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reading_log_bibleId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reading_log"`);
  }
}
