import {
  AuthProvider,
  SubscriptionStatus,
  SubscriptionTier,
  PreferredLanguages,
  PreferredBibleVersion,
  PreferredAIVoice,
  UserTone,
  Voice,
  ALERT,
  UserRole,
} from 'src/modules/user/enums/user.enums';
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { Prayer } from './prayer.entity';
import { BaseEntity } from './base.entity';
import { AccessToken } from './access-token.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { EmailVerificationToken } from './email-verification-token.entity';
import {
  AiSettings,
  user_preferences,
} from 'src/shared/interfaces/aisetting.interface';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  @Index('idx_users_email')
  email: string;

  @Column({ name: 'password_hash', nullable: true })
  passwordHash: string;

  @Column({ name: 'full_name', nullable: true })
  fullName: string;

  @Column({ name: 'profile_picture', type: 'text', nullable: true })
  profilePicture: string | null;

  @Column({ name: 'about', type: 'text', nullable: true })
  about: string | null;

  @Column({
    name: 'phone_number',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  @Index('idx_users_phone_number')
  phoneNumber: string | null;

  @Column({
    name: 'auth_provider',
    type: 'varchar',
    default: AuthProvider.EMAIL,
  })
  @Index('idx_users_auth_provider')
  authProvider: AuthProvider;

  @Column({
    name: 'role',
    type: 'varchar',
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ name: 'google_id', unique: true, nullable: true })
  @Index('idx_users_google_id')
  googleId: string;

  @Column({ name: 'apple_id', unique: true, nullable: true })
  @Index('idx_users_apple_id')
  appleId: string;

  @Column({
    name: 'subscription_tier',
    type: 'varchar',
    default: SubscriptionTier.FREE,
  })
  subscriptionTier: SubscriptionTier;

  @Column({
    name: 'subscription_status',
    type: 'varchar',
    default: SubscriptionStatus.ACTIVE,
  })
  subscriptionStatus: SubscriptionStatus;

  @Column({
    name: 'subscription_started_at',
    type: 'timestamp',
    nullable: true,
  })
  subscriptionStartedAt: Date;

  @Column({
    name: 'subscription_expires_at',
    type: 'timestamp',
    nullable: true,
  })
  subscriptionExpiresAt: Date;

  @Column({
    name: 'preferred_language',
    type: 'varchar',
    default: PreferredLanguages.en,
  })
  preferredLanguage: string;

  @Column({
    name: 'preferred_bible_version',
    type: 'varchar',
    default: PreferredBibleVersion.KJV,
  })
  preferredBibleVersion: string;

  @Column({
    name: 'preferred_voice',
    type: 'varchar',
    default: PreferredAIVoice.FEMALE,
  })
  preferredVoice: string;

  @Column({
    name: 'ai_settings',
    type: 'jsonb',
    default: {
      tone: UserTone.FRIENDLY,
      voice: Voice.FEMALE,
      alerts: ALERT.SMS,
      follow_up: false,
    },
  })
  aiSettings: AiSettings;

  @Column({
    name: 'meditation_time_morning',
    type: 'time',
    default: '06:00:00',
  })
  meditationTimeMorning: string;

  @Column({
    name: 'meditation_time_evening',
    type: 'time',
    default: '20:00:00',
  })
  meditationTimeEvening: string;

  @Column({
    name: 'timezone',
    type: 'varchar',
    default: 'UTC',
  })
  timezone: string;

  @Column({
    name: 'onboarding_completed',
    default: false,
  })
  onboardingCompleted: boolean;

  @Column({
    name: 'email_verified',
    default: false,
  })
  emailVerified: boolean;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive: boolean;

  @Column({ name: 'last_active_at', type: 'timestamp', nullable: true })
  lastActiveAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date;

  @Column({
    name: 'user_preferences',
    type: 'jsonb',
    default: {
      preferred_translator: 'KJV',
      scripture_frequency: 'balanced',
      microphone: 'false',
    },
  })
  user_preferences: user_preferences;

  @OneToMany(() => AccessToken, (accessToken) => accessToken.user)
  accessTokens: AccessToken[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(
    () => PasswordResetToken,
    (passwordResetToken) => passwordResetToken.user,
  )
  passwordResetTokens: PasswordResetToken[];

  @OneToMany(
    () => EmailVerificationToken,
    (emailVerificationToken) => emailVerificationToken.user,
  )
  emailVerificationTokens: EmailVerificationToken[];

  @OneToMany(() => Prayer, (prayer) => prayer.user)
  prayers: Prayer[];
}
