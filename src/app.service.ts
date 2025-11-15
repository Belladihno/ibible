import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcomeMessage() {
    return {
      message: 'Welcome to REA - Interactive Bible App API',
      data: {
        description: 'A friend that brings you closer to God',
        version: '1.0.0',
        status: 'active',
      },
    };
  }
}
