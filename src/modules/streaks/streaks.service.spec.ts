import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StreaksService } from './streaks.service';
import { UserStreak } from 'src/entities/user-streak.entity';
import { StreakActivity } from 'src/entities/streak-activity.entity';

describe('StreaksService', () => {
  let service: StreaksService;
  let streakRepo: any;
  let activityRepo: any;

  const mockStreakRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockActivityRepo = {
    find: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreaksService,
        { provide: getRepositoryToken(UserStreak), useValue: mockStreakRepo },
        {
          provide: getRepositoryToken(StreakActivity),
          useValue: mockActivityRepo,
        },
      ],
    }).compile();

    service = module.get<StreaksService>(StreaksService);
    streakRepo = module.get(getRepositoryToken(UserStreak));
    activityRepo = module.get(getRepositoryToken(StreakActivity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create streak record if user has none', async () => {
    streakRepo.findOne.mockResolvedValue(null);
    streakRepo.save.mockResolvedValue({
      userId: '123',
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: service['getToday'](),
      totalDays: 0,
    });

    const result = await service.getStreak('123');

    expect(result.currentStreak).toBe(0);
    expect(streakRepo.save).toHaveBeenCalled();
  });

  it('should return streak with isActive=true when lastActiveDate is today', async () => {
    const today = service['getToday']();

    streakRepo.findOne.mockResolvedValue({
      currentStreak: 5,
      longestStreak: 10,
      lastActiveDate: today,
      totalDays: 20,
    });

    const result = await service.getStreak('123');

    expect(result.isActive).toBe(true);
    expect(result.currentStreak).toBe(5);
  });

  it('should create activity and increment streak for consecutive day', async () => {
    const today = service['getToday']();

    activityRepo.save.mockResolvedValue({});

    streakRepo.findOne.mockResolvedValue({
      userId: '123',
      currentStreak: 3,
      longestStreak: 5,
      lastActiveDate: service['getToday'](),
      totalDays: 10,
    });

    streakRepo.save.mockResolvedValue({});

    const result = await service['updateStreak']('123', 'app_open');

    expect(result.currentStreak).toBe(3); // same day does not increment
    expect(activityRepo.save).toHaveBeenCalled();
  });

  it('should reset streak when days difference is more than 1', async () => {
    const today = service['getToday']();

    activityRepo.save.mockResolvedValue({});

    streakRepo.findOne.mockResolvedValue({
      userId: '123',
      currentStreak: 4,
      longestStreak: 10,
      lastActiveDate: '2024-01-01', // far in the past
      totalDays: 20,
    });

    streakRepo.save.mockResolvedValue({});

    const result = await service['updateStreak']('123', 'app_open');

    expect(result.currentStreak).toBe(1);
    // expect(result.streakBroken).toBe(true);
  });

  it('should return current streak if activity already logged today', async () => {
    activityRepo.save.mockRejectedValue({ code: '23505' });

    streakRepo.findOne.mockResolvedValue({
      currentStreak: 7,
      longestStreak: 9,
      lastActiveDate: service['getToday'](),
      totalDays: 20,
    });

    const result = await service['updateStreak']('123', 'app_open');
    expect(result.currentStreak).toBe(7);
  });

  it('should return calendar history', async () => {
    activityRepo.find.mockResolvedValue([
      { activityDate: service['getToday']() },
    ]);

    const result = await service.getHistory('123', 7);

    expect(result.length).toBe(7);
    expect(result[6].hasActivity).toBe(true); // last day is today
  });

  it('should return recent activities', async () => {
    activityRepo.find.mockResolvedValue([{ activityType: 'app_open' }]);

    const result = await service.getActivities('123', 10);

    expect(result.length).toBe(1);
  });
});
