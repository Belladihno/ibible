export interface IMemoriesService {
  getRecentMemories(userId: string, limit: number): Promise<string[]>;
}

export interface IDiscoverService {
  getRecentEmotions(userId: string, limit: number): Promise<string[]>;
}
