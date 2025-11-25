import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateMeditationTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create meditation_plans table
    await queryRunner.createTable(
      new Table({
        name: 'meditation_plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'morning_time',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'evening_time',
            type: 'time',
            isNullable: true,
          },
          {
            name: 'morning_enabled',
            type: 'boolean',
            default: true,
          },
          {
            name: 'evening_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'duration_minutes',
            type: 'integer',
            default: 10,
          },
          {
            name: 'frequency',
            type: 'varchar',
            length: '50',
            default: "'daily'",
          },
          {
            name: 'custom_schedule',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create meditation_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'meditation_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'duration_seconds',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'verse_reference',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'verse_text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'session_type',
            type: 'varchar',
            length: '20',
            default: "'morning'",
          },
          {
            name: 'completed',
            type: 'boolean',
            default: false,
          },
          {
            name: 'notes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'meditation_plans',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'meditation_sessions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add indexes for better query performance
    await queryRunner.createIndex(
      'meditation_plans',
      new TableIndex({
        name: 'IDX_meditation_plans_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'meditation_sessions',
      new TableIndex({
        name: 'IDX_meditation_sessions_user_id_started_at',
        columnNames: ['user_id', 'started_at'],
      }),
    );

    await queryRunner.createIndex(
      'meditation_sessions',
      new TableIndex({
        name: 'IDX_meditation_sessions_user_id_completed_at',
        columnNames: ['user_id', 'completed_at'],
      }),
    );

    await queryRunner.createIndex(
      'meditation_sessions',
      new TableIndex({
        name: 'IDX_meditation_sessions_completed',
        columnNames: ['completed'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('meditation_sessions');
    await queryRunner.dropTable('meditation_plans');
  }
}
