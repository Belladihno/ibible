import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { Contact } from 'src/entities/contact-us.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Contact])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
