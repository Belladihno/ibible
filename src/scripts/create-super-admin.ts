import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../entities/user.entity';
import { UserRole } from '../modules/user/enums/user.enums';
import * as readline from 'readline';
import * as path from 'path';

config();

async function promoteUserToSuperAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('Please provide an email address as an argument.');
    console.log(
      'Usage: npx ts-node -r tsconfig-paths/register src/scripts/create-super-admin.ts <email>',
    );
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [path.join(__dirname, '..', 'entities', '*.entity.ts')],
    synchronize: false,
  });

  console.log(`Connecting to database...`);
  try {
    await dataSource.initialize();
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }

  const userRepo = dataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });

  if (!user) {
    console.error(`User with email ${email} not found.`);
    await dataSource.destroy();
    process.exit(1);
  }

  console.log(`User found: ${user.fullName} (${user.email})`);
  console.log(`Current Role: ${user.role}`);

  if (user.role === UserRole.SUPER_ADMIN) {
    console.log('User is already a Super Admin.');
    await dataSource.destroy();
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    'Are you sure you want to promote this user to Super Admin? (yes/no): ',
    (answer) => {
      void (async () => {
        if (answer.toLowerCase() === 'yes') {
          user.role = UserRole.SUPER_ADMIN;
          await userRepo.save(user);
          console.log(`Successfully promoted ${user.email} to Super Admin.`);
        } else {
          console.log('Operation cancelled.');
        }
        rl.close();
        await dataSource.destroy();
        process.exit(0);
      })();
    },
  );
}

void promoteUserToSuperAdmin();
