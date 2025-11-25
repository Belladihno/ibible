import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AppService {
  getWelcomeMessage(req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return {
      message: 'Welcome to REA - Interactive Bible App API',
      data: {
        description: 'A friend that brings you closer to God',
        version: '1.0.0',
        status: 'active',
        docs: {
          scalar: `${baseUrl}/api/v1/reference`,
          swagger: `${baseUrl}/api/v1/docs`,
        },
      },
    };
  }
}
