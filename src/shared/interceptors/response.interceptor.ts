import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T & { timestamp: string };
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
        let responseData: unknown = result;

        // Determine statusCode if controller provided one
        let statusCode = 200;
        if (
          hasMessageOrData(result) &&
          'statusCode' in (result as Record<string, unknown>)
        ) {
          const sc = (result as Record<string, unknown>).statusCode;
          if (typeof sc === 'number') {
            statusCode = sc;
          }
        }

        // If controller returned an object, extract message + data safely
        if (hasMessageOrData(result)) {
          const resObj = result as Record<string, unknown>;
          if (typeof resObj.message === 'string') {
            responseMessage = resObj.message;
          }

          if ('data' in resObj) {
            responseData = resObj.data;
          }
        }

        // Build a safe data object to return (always an object with timestamp)
        let dataObj: Record<string, unknown>;
        if (responseData === undefined || responseData === null) {
          dataObj = {};
        } else if (typeof responseData === 'object') {
          dataObj = { ...(responseData as Record<string, unknown>) };
        } else {
          // Primitive data — put it under `value`
          dataObj = { value: responseData };
        }

        dataObj.timestamp = new Date().toISOString();

        return {
          statusCode,
          message: responseMessage,
          data: dataObj as T & { timestamp: string },
        };
      }),
    );
  }
}
