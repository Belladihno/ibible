import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { PasswordResetToken } from 'src/entities/password-reset-token.entity';
import { RefreshToken } from 'src/entities/refresh-token.entity';
import { AccessToken } from 'src/entities/access-token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        UserService,
        JwtService,
        ConfigService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(AccessToken),
          useClass: Repository,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Add more tests here to validate controller logic
});
