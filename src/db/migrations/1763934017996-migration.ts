import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1763934017996 implements MigrationInterface {
  name = 'Migration1763934017996';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "waitlist_entries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_90cae6cb55d051291054d7e8d12" UNIQUE ("email"), CONSTRAINT "PK_bd0ef66fff81d3be7b7a1568a4d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying, "full_name" character varying, "profile_picture" text, "about" text, "phone_number" character varying, "auth_provider" character varying NOT NULL DEFAULT 'email', "google_id" character varying, "apple_id" character varying, "subscription_tier" character varying NOT NULL DEFAULT 'free', "subscription_status" character varying NOT NULL DEFAULT 'active', "subscription_started_at" TIMESTAMP, "subscription_expires_at" TIMESTAMP, "preferred_language" character varying NOT NULL DEFAULT 'en', "preferred_bible_version" character varying NOT NULL DEFAULT 'KJV', "preferred_voice" character varying NOT NULL DEFAULT 'female', "meditation_time_morning" TIME NOT NULL DEFAULT '06:00:00', "meditation_time_evening" TIME NOT NULL DEFAULT '20:00:00', "timezone" character varying NOT NULL DEFAULT 'UTC', "onboarding_completed" boolean NOT NULL DEFAULT false, "email_verified" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "last_active_at" TIMESTAMP, "deleted_at" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_17d1817f241f10a3dbafb169fd2" UNIQUE ("phone_number"), CONSTRAINT "UQ_0bd5012aeb82628e07f6a1be53b" UNIQUE ("google_id"), CONSTRAINT "UQ_222297ce9ce93ae516d1e82b07c" UNIQUE ("apple_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_email" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_phone_number" ON "users" ("phone_number") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_auth_provider" ON "users" ("auth_provider") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_google_id" ON "users" ("google_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_users_apple_id" ON "users" ("apple_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57" UNIQUE ("token"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_token" ON "refresh_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "is_used" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ab673f0e63eac966762155508ee" UNIQUE ("token"), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_password_reset_tokens_token" ON "password_reset_tokens" ("token") `,
    );
    await queryRunner.query(
      `CREATE TABLE "email_verification_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "otp" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "verified_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid, CONSTRAINT "PK_417a095bbed21c2369a6a01ab9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_user_id" ON "email_verification_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_otp" ON "email_verification_tokens" ("otp") `,
    );
    await queryRunner.query(
      `CREATE TABLE "daily_verses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "date" date NOT NULL, "reference" character varying NOT NULL, "verseData" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_af524c629ad1d2cc04072558c7a" UNIQUE ("date"), CONSTRAINT "PK_308cd409c7fcf98dd24ce41d4c0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_af524c629ad1d2cc04072558c7" ON "daily_verses" ("date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "access_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "jti" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_28772cc8c3cd0a9d22318e07804" UNIQUE ("jti"), CONSTRAINT "PK_65140f59763ff994a0252488166" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_access_tokens_jti" ON "access_tokens" ("jti") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "access_tokens" ADD CONSTRAINT "FK_09ee750a035b06e0c7f0704687e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "access_tokens" DROP CONSTRAINT "FK_09ee750a035b06e0c7f0704687e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "FK_fdcb77f72f529bf65c95d72a147"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_access_tokens_jti"`);
    await queryRunner.query(`DROP TABLE "access_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_af524c629ad1d2cc04072558c7"`,
    );
    await queryRunner.query(`DROP TABLE "daily_verses"`);
    await queryRunner.query(`DROP INDEX "public"."idx_otp"`);
    await queryRunner.query(`DROP INDEX "public"."idx_user_id"`);
    await queryRunner.query(`DROP TABLE "email_verification_tokens"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_password_reset_tokens_token"`,
    );
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."idx_refresh_tokens_token"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_apple_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_google_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_auth_provider"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_phone_number"`);
    await queryRunner.query(`DROP INDEX "public"."idx_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "waitlist_entries"`);
  }
}
