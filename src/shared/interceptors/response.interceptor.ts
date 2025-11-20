import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

interface MessageDataShape {
  message?: unknown;
  data?: unknown;
}

const hasMessageOrData = (value: unknown): value is MessageDataShape => {
  return typeof value === 'object' && value !== null;
};

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // Default response message
        let responseMessage = 'Request successful';

        // Extracted data (default to whatever controller returned)
        let responseData: T = result;

        // If controller returned an object, extract message + data safely
        if (hasMessageOrData(result)) {
          if (typeof result.message === 'string') {
            responseMessage = result.message;
          }

          if ('data' in result) {
            responseData = result.data as T;
          }
        }

        return {
          success: true,
          message: responseMessage,
          data: responseData,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
