import { DataSource } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { UserRole } from 'src/modules/user/enums/user.enums';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

export async function seedSuperAdmin(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);

  const email =
    process.env.SUPER_ADMIN_EMAIL || 'superadmin@rea-interactive-bible.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  const existingUser = await userRepository.findOne({
    where: { email },
  });

  if (existingUser) {
    if (existingUser.role === UserRole.SUPER_ADMIN) {
      return;
    } else {
      const hashedPassword = await bcrypt.hash(password, 12);
      existingUser.passwordHash = hashedPassword;
      existingUser.role = UserRole.SUPER_ADMIN;
      existingUser.fullName = name;
      existingUser.emailVerified = true;
      existingUser.isActive = true;

      await userRepository.save(existingUser);

      return;
    }
  }
  const hashedPassword = await bcrypt.hash(password, 12);

  const superAdmin = userRepository.create({
    email,
    passwordHash: hashedPassword,
    fullName: name,
    role: UserRole.SUPER_ADMIN,
    emailVerified: true,
    isActive: true,
  });

  await userRepository.save(superAdmin);
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: ['src/**/*.entity{.ts,.js}'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    await seedSuperAdmin(dataSource);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
