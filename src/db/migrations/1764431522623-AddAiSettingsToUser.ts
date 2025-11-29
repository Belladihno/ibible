import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiSettingsToUser1764431522623 implements MigrationInterface {
  name = 'AddAiSettingsToUser1764431522623';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."prayer_reminders_type_enum" AS ENUM('morning', 'afternoon', 'evening', 'custom')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prayer_reminders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."prayer_reminders_type_enum" NOT NULL, "customTime" TIME, "customStartDate" date, "customEndDate" date, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "prayerId" uuid NOT NULL, CONSTRAINT "PK_14ba0bbacbd7d9cd18d128026a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prayers_type_enum" AS ENUM('self', 'others')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prayers_status_enum" AS ENUM('ongoing', 'answered')`,
    );
    await queryRunner.query(
      `CREATE TABLE "prayers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."prayers_type_enum" NOT NULL DEFAULT 'self', "originalRequest" text NOT NULL, "rephrasedRequest" text, "aiPrayer" text, "status" "public"."prayers_status_enum" NOT NULL DEFAULT 'ongoing', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, CONSTRAINT "PK_e999e971b29faf22932664580ee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_streaks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "current_streak" integer NOT NULL DEFAULT '0', "longest_streak" integer NOT NULL DEFAULT '0', "last_active_date" date NOT NULL, "total_days" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_91fc9bfd912d8ce3ae4be2ea193" UNIQUE ("user_id"), CONSTRAINT "PK_a6d61a62372a94e55ca04ab8373" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_emotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "emotion" character varying(50) NOT NULL, "logged_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e374a4824150680874b3a4dcdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_emotions_emotion" ON "user_emotions" ("emotion") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_emotions_logged_at" ON "user_emotions" ("logged_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b8679ef39baa91dde2a96d13d" ON "user_emotions" ("user_id", "logged_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "streak_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" character varying NOT NULL, "activity_type" character varying NOT NULL, "activity_date" date NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4edb001cadf7d7ae7d67929db81" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."temp_prayers_type_enum" AS ENUM('self', 'others')`,
    );
    await queryRunner.query(
      `CREATE TABLE "temp_prayers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."temp_prayers_type_enum" NOT NULL DEFAULT 'self', "originalRequest" text NOT NULL, "rephrasedRequest" text, "user_id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_08199e4226e1e629f839d82696a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "emotion_verse_mappings" ("id" SERIAL NOT NULL, "emotion" character varying(50) NOT NULL, "book" character varying NOT NULL, "chapter" integer NOT NULL, "verse" integer NOT NULL, "verse_text" text NOT NULL, "relevance_score" double precision NOT NULL DEFAULT '1', "category" character varying(50), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_64d4466ecfa9f8ae202f809369f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_emotion_verse_mappings_emotion" ON "emotion_verse_mappings" ("emotion") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_12a54afc0d16e98cba49b51cd1" ON "emotion_verse_mappings" ("emotion", "relevance_score") `,
    );
    await queryRunner.query(
      `CREATE TABLE "bookmarks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "book" character varying NOT NULL, "chapter" integer NOT NULL, "verse" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_7f976ef6cecd37a53bd11685f32" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bible_books_testament_enum" AS ENUM('new', 'old')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bible_books" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "testament" "public"."bible_books_testament_enum" NOT NULL, "book_order" integer NOT NULL, "total_chapters" integer NOT NULL, "abbreviation" character varying(10), CONSTRAINT "PK_75f849e04fd8fc7629c7ce9a16f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "ai_settings" jsonb NOT NULL DEFAULT '{"tone":"friendly"}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayer_reminders" ADD CONSTRAINT "FK_4e971888719eaece7a668c97440" FOREIGN KEY ("prayerId") REFERENCES "prayers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayers" ADD CONSTRAINT "FK_25a96949638aac5ecc471e58aac" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_emotions" ADD CONSTRAINT "FK_f35dbdc72dc44545b6d303d7019" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookmarks" ADD CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookmarks" DROP CONSTRAINT "FK_58a0fbaee65cd8959a870ee678c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_emotions" DROP CONSTRAINT "FK_f35dbdc72dc44545b6d303d7019"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayers" DROP CONSTRAINT "FK_25a96949638aac5ecc471e58aac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayer_reminders" DROP CONSTRAINT "FK_4e971888719eaece7a668c97440"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ai_settings"`);
    await queryRunner.query(`DROP TABLE "bible_books"`);
    await queryRunner.query(`DROP TYPE "public"."bible_books_testament_enum"`);
    await queryRunner.query(`DROP TABLE "bookmarks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12a54afc0d16e98cba49b51cd1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_emotion_verse_mappings_emotion"`,
    );
    await queryRunner.query(`DROP TABLE "emotion_verse_mappings"`);
    await queryRunner.query(`DROP TABLE "temp_prayers"`);
    await queryRunner.query(`DROP TYPE "public"."temp_prayers_type_enum"`);
    await queryRunner.query(`DROP TABLE "streak_activities"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b8679ef39baa91dde2a96d13d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_emotions_logged_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_user_emotions_emotion"`);
    await queryRunner.query(`DROP TABLE "user_emotions"`);
    await queryRunner.query(`DROP TABLE "user_streaks"`);
    await queryRunner.query(`DROP TABLE "prayers"`);
    await queryRunner.query(`DROP TYPE "public"."prayers_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."prayers_type_enum"`);
    await queryRunner.query(`DROP TABLE "prayer_reminders"`);
    await queryRunner.query(`DROP TYPE "public"."prayer_reminders_type_enum"`);
  }
}
