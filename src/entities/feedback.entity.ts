import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('feedback')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  type?: 'general' | 'issue' | null;

  // General Feedback
  @Column({ type: 'varchar', nullable: true })
  experience?: string | null;

  @Column({ type: 'text', nullable: true })
  feedbackText?: string | null;

  // Issue Feedback
  @Column({ type: 'varchar', nullable: true })
  issueType?: string | null;

  @Column({ type: 'text', nullable: true })
  issueDescription?: string | null;

  @Column('simple-array', { nullable: true })
  imageUrls?: string[] | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt?: Date;
}
