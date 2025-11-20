import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistService } from './waitlist.service';
import { WaitListEntryModelAction } from 'src/actions/model-actions';
import { EmailService } from 'src/module/email/email.service';

describe('WaitlistService', () => {
  let service: WaitlistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: WaitListEntryModelAction,
          useValue: {},
        },
        {
          provide: EmailService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more tests here to validate the logic
});
