import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private repo: Repository<User>,
  ) {}

  async create(data: CreateUserDto) {
    const user = this.repo.create(data);

    if (data.password) {
      user.passwordHash = await bcrypt.hash(data.password, 10);
    }

    try {
      return await this.repo.save(user);
    } catch (error: any) {
      if (error.code === '23505' && error.detail.includes('email')) {
        throw new ConflictException('Email already exists.');
      }
      throw error;
    }
  }

  findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async update(id: string, changes: UpdateUserDto) {
    const user = await this.findOne(id);

    if (changes.password) {
      changes['passwordHash'] = await bcrypt.hash(changes.password, 10);
      delete changes.password;
    }

    Object.assign(user, changes);

    return this.repo.save(user);
  }

  async remove(id: string) {
    const user = await this.findOne(id);
    user.deletedAt = new Date();
    user.isActive = false;

    return this.repo.save(user);
  }
}
