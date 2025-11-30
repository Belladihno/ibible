// src/migrations/[TIMESTAMP]-CreateStreakTables.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStreakTables1732500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE user_streaks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_active_date DATE NOT NULL,
        total_days INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);

      CREATE TABLE streak_activities (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type VARCHAR(50) NOT NULL,
        activity_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX idx_streak_activities_user_date ON streak_activities(user_id, activity_date);
      CREATE UNIQUE INDEX idx_streak_activities_unique ON streak_activities(user_id, activity_type, activity_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE streak_activities;
      DROP TABLE user_streaks;
    `);
  }
}
