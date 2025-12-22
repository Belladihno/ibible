import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateEarlyAccessDto } from './dto/create-early-access.dto';
import { EarlyAccessEntryModelAction } from 'src/actions/model-actions';

@Injectable()
export class EarlyAccessService {
  private readonly logger = new Logger(EarlyAccessService.name);

  constructor(
    private readonly earlyAccessEntryModelAction: EarlyAccessEntryModelAction,
  ) {}

  async create(createEarlyAccessDto: CreateEarlyAccessDto) {
    const { email, name } = createEarlyAccessDto;

    try {
      const entry = await this.earlyAccessEntryModelAction.create({
        createPayload: {
          email,
          firstName: name,
        },
        transactionOptions: {
          useTransaction: false,
        },
      });

      return {
        message: 'Success! Your early access request has been submitted.',
        email: entry.email,
        name: entry.firstName,
      };
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException(
          'This email is already registered for early access.',
        );
      }

      this.logger.error('Failed to create early access entry', error);
      throw new InternalServerErrorException();
    }
  }
}
