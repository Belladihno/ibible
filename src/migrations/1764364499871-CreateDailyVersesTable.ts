import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDailyVersesTable1764364499871 implements MigrationInterface {
  name = 'CreateDailyVersesTable1764364499871';

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
      `CREATE TABLE "email_verification_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "otp" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "verified_at" TIMESTAMP, "user_id" uuid, CONSTRAINT "PK_417a095bbed21c2369a6a01ab9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_id" ON "email_verification_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_otp" ON "email_verification_tokens" ("otp") `,
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
      `CREATE TYPE "public"."temp_prayers_type_enum" AS ENUM('self', 'others')`,
    );
    await queryRunner.query(
      `CREATE TABLE "temp_prayers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" "public"."temp_prayers_type_enum" NOT NULL DEFAULT 'self', "originalRequest" text NOT NULL, "rephrasedRequest" text, "user_id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_08199e4226e1e629f839d82696a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reading_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying, "bibleId" character varying DEFAULT 'de4e12af7f28f599-02', "book" character varying, "chapter" character varying, "verse" character varying, "version" character varying, "timestamp" character varying, CONSTRAINT "PK_d54aa951bc4a8a3de71e9682d34" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meditation_verse_library" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reference" character varying NOT NULL, "text" text, "translation" character varying, "metadata" jsonb, "timesUsed" integer NOT NULL DEFAULT '0', "lastUsed" TIMESTAMP, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ba346fb0f7999c337747b5cf6f8" UNIQUE ("reference"), CONSTRAINT "PK_57a2324bba78e3a17c52e2e2462" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meditation_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "started_at" TIMESTAMP NOT NULL, "completed_at" TIMESTAMP, "duration_seconds" integer, "verse_reference" character varying(100), "verse_text" text, "sessionType" character varying(20) NOT NULL DEFAULT 'morning', "completed" boolean NOT NULL DEFAULT false, "notes" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_e7a1372e46e2d2982529d1a0be4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b5bb98d0749a0b418c9025ce25" ON "meditation_sessions" ("user_id", "completed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_366c8b0ca890b9c395001b5d7f" ON "meditation_sessions" ("user_id", "started_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "meditation_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "morning_time" TIME, "evening_time" TIME, "morning_enabled" boolean NOT NULL DEFAULT true, "evening_enabled" boolean NOT NULL DEFAULT false, "duration_minutes" integer NOT NULL DEFAULT '10', "frequency" character varying(50) NOT NULL DEFAULT 'daily', "customSchedule" jsonb, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_b7f4d5cc72d687be028aeb68167" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "meditation_daily_verses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "reference" character varying(100) NOT NULL, "verseData" text NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_15d7b5bef6bff504d6a4a081368" UNIQUE ("date"), CONSTRAINT "PK_d3ed51fed36f80037576bae6820" PRIMARY KEY ("id"))`,
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
      `CREATE TABLE "daily_verses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" date NOT NULL, "reference" character varying NOT NULL, "verseData" jsonb NOT NULL, CONSTRAINT "UQ_af524c629ad1d2cc04072558c7a" UNIQUE ("date"), CONSTRAINT "PK_308cd409c7fcf98dd24ce41d4c0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af524c629ad1d2cc04072558c7" ON "daily_verses" ("date") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bible_books_testament_enum" AS ENUM('new', 'old')`,
    );
    await queryRunner.query(
      `CREATE TABLE "bible_books" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "testament" "public"."bible_books_testament_enum" NOT NULL, "book_order" integer NOT NULL, "total_chapters" integer NOT NULL, "abbreviation" character varying(10), CONSTRAINT "PK_75f849e04fd8fc7629c7ce9a16f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" DROP COLUMN "createdAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "access_tokens" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "about" text`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "UQ_17d1817f241f10a3dbafb169fd2" UNIQUE ("phone_number")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_phone_number" ON "users" ("phone_number") `,
    );
    await queryRunner.query(
      `ALTER TABLE "prayer_reminders" ADD CONSTRAINT "FK_4e971888719eaece7a668c97440" FOREIGN KEY ("prayerId") REFERENCES "prayers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayers" ADD CONSTRAINT "FK_25a96949638aac5ecc471e58aac" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_emotions" ADD CONSTRAINT "FK_f35dbdc72dc44545b6d303d7019" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meditation_sessions" ADD CONSTRAINT "FK_6d0afea25626289a7d0ed267361" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "meditation_plans" ADD CONSTRAINT "FK_8c58c96ee7a6cb5001d00781e8d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "meditation_plans" DROP CONSTRAINT "FK_8c58c96ee7a6cb5001d00781e8d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meditation_sessions" DROP CONSTRAINT "FK_6d0afea25626289a7d0ed267361"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_emotions" DROP CONSTRAINT "FK_f35dbdc72dc44545b6d303d7019"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayers" DROP CONSTRAINT "FK_25a96949638aac5ecc471e58aac"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prayer_reminders" DROP CONSTRAINT "FK_4e971888719eaece7a668c97440"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_users_phone_number"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "UQ_17d1817f241f10a3dbafb169fd2"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "about"`);
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "access_tokens" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" DROP COLUMN "updated_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" DROP COLUMN "created_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "waitlist_entries" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`DROP TABLE "bible_books"`);
    await queryRunner.query(`DROP TYPE "public"."bible_books_testament_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af524c629ad1d2cc04072558c7"`,
    );
    await queryRunner.query(`DROP TABLE "daily_verses"`);
    await queryRunner.query(`DROP TABLE "bookmarks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_12a54afc0d16e98cba49b51cd1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_emotion_verse_mappings_emotion"`,
    );
    await queryRunner.query(`DROP TABLE "emotion_verse_mappings"`);
    await queryRunner.query(`DROP TABLE "meditation_daily_verses"`);
    await queryRunner.query(`DROP TABLE "meditation_plans"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_366c8b0ca890b9c395001b5d7f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b5bb98d0749a0b418c9025ce25"`,
    );
    await queryRunner.query(`DROP TABLE "meditation_sessions"`);
    await queryRunner.query(`DROP TABLE "meditation_verse_library"`);
    await queryRunner.query(`DROP TABLE "reading_log"`);
    await queryRunner.query(`DROP TABLE "temp_prayers"`);
    await queryRunner.query(`DROP TYPE "public"."temp_prayers_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b8679ef39baa91dde2a96d13d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_user_emotions_logged_at"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_user_emotions_emotion"`);
    await queryRunner.query(`DROP TABLE "user_emotions"`);
    await queryRunner.query(`DROP INDEX "public"."idx_otp"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_id"`);
    await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
    await queryRunner.query(`DROP TABLE "prayers"`);
    await queryRunner.query(`DROP TYPE "public"."prayers_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."prayers_type_enum"`);
    await queryRunner.query(`DROP TABLE "prayer_reminders"`);
    await queryRunner.query(`DROP TYPE "public"."prayer_reminders_type_enum"`);
  }
}
