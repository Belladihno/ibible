import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AppService {
  getWelcomeMessage(req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const apiVersion = process.env.API_VERSION || '';
    const prefix = apiVersion ? `/${apiVersion}` : '';
    return {
      message: 'Welcome to REA - Interactive Bible App API',
      data: {
        description: 'A friend that brings you closer to God',
        version: '1.0.0',
        status: 'active',
        docs: {
          scalar: `${baseUrl}${prefix}/reference`,
          swagger: `${baseUrl}${prefix}/docs`,
        },
      },
    };
  }
}
