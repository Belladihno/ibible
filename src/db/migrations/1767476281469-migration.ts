import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1767476281469 implements MigrationInterface {
  name = 'Migration1767476281469';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_ai_usage_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_ai_usage_feature"`);
    await queryRunner.query(
      `CREATE TYPE "public"."memories_visibility_enum" AS ENUM('private', 'public', 'shared')`,
    );
    await queryRunner.query(
      `CREATE TABLE "memories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "tags" text array NOT NULL DEFAULT '{}', "verseRefs" text array NOT NULL DEFAULT '{}', "visibility" "public"."memories_visibility_enum" NOT NULL DEFAULT 'private', "followUp" jsonb, "aiRephrase" jsonb, "skipAI" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_aaa0692d9496fe827b0568612f8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_09f2d38267f7e0cf58060592a1" ON "memories" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "title" character varying NOT NULL DEFAULT 'New Conversation', "isActive" boolean NOT NULL DEFAULT true, "contextSummary" text, CONSTRAINT "PK_ff117d9f57807c4f2e3034a39f3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b47ce1b8d59cd63dd1134c9d07" ON "chat_conversations" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_messages_sender_enum" AS ENUM('user', 'ai')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "sender" "public"."chat_messages_sender_enum" NOT NULL, "content" text NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "references" text array NOT NULL DEFAULT '{}', "conversationId" uuid NOT NULL, CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" ALTER COLUMN "provider" DROP DEFAULT`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ai_usage_created_at" ON "ai_usage_logs" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ai_usage_model" ON "ai_usage_logs" ("model") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ai_usage_user_id" ON "ai_usage_logs" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_45745953065384cc9c4264c2a3d" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_45745953065384cc9c4264c2a3d"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_ai_usage_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ai_usage_model"`);
    await queryRunner.query(`DROP INDEX "public"."idx_ai_usage_created_at"`);
    await queryRunner.query(
      `ALTER TABLE "ai_usage_logs" ALTER COLUMN "provider" SET DEFAULT 'openrouter'`,
    );
    await queryRunner.query(`DROP TABLE "chat_messages"`);
    await queryRunner.query(`DROP TYPE "public"."chat_messages_sender_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b47ce1b8d59cd63dd1134c9d07"`,
    );
    await queryRunner.query(`DROP TABLE "chat_conversations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_09f2d38267f7e0cf58060592a1"`,
    );
    await queryRunner.query(`DROP TABLE "memories"`);
    await queryRunner.query(`DROP TYPE "public"."memories_visibility_enum"`);
    await queryRunner.query(
      `CREATE INDEX "idx_ai_usage_feature" ON "ai_usage_logs" ("feature") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_ai_usage_user" ON "ai_usage_logs" ("user_id") `,
    );
  }
}
