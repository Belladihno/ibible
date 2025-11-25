import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMeditationVersesTables1732500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create meditation_verse_library table
    await queryRunner.createTable(
      new Table({
        name: 'meditation_verse_library',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'text',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'translation',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'times_used',
            type: 'integer',
            default: 0,
          },
          {
            name: 'last_used',
            type: 'timestamp',
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
        ],
      }),
      true,
    );

    // Create meditation_daily_verses table
    await queryRunner.createTable(
      new Table({
        name: 'meditation_daily_verses',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'date',
            type: 'date',
            isUnique: true,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'verse_data',
            type: 'text',
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

    await queryRunner.createIndex(
      'meditation_verse_library',
      new TableIndex({
        name: 'IDX_meditation_verse_library_active',
        columnNames: ['active'],
      }),
    );

    await queryRunner.createIndex(
      'meditation_verse_library',
      new TableIndex({
        name: 'IDX_meditation_verse_library_times_used',
        columnNames: ['times_used'],
      }),
    );

    await queryRunner.createIndex(
      'meditation_verse_library',
      new TableIndex({
        name: 'IDX_meditation_verse_library_last_used',
        columnNames: ['last_used'],
      }),
    );

    await queryRunner.createIndex(
      'meditation_daily_verses',
      new TableIndex({
        name: 'IDX_meditation_daily_verses_date',
        columnNames: ['date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('meditation_daily_verses', true);
    await queryRunner.dropTable('meditation_verse_library', true);
  }
}
