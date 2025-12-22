import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';
import {
  TRACK_ACTIVITY_KEY,
  TRACK_ACTIVITY_OPTIONS_KEY,
  TrackActivityOptions,
} from 'src/decorators/track-activity.decorator';
import { ActivityType } from 'src/modules/user/enums/user.enums';

@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private analyticsService: AnalyticsService,
  ) {}

  private getNestedProperty(obj: unknown, path: string): unknown {
    if (typeof obj !== 'object' || obj === null) return undefined;
    return path
      .split('.')
      .reduce(
        (current: unknown, prop: string) =>
          (current as Record<string, unknown>)?.[prop],
        obj,
      );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const featureName = this.reflector.get<string>(
      TRACK_ACTIVITY_KEY,
      context.getHandler(),
    );

    const options = this.reflector.get<TrackActivityOptions>(
      TRACK_ACTIVITY_OPTIONS_KEY,
      context.getHandler(),
    );

    if (featureName) {
      const request = context.switchToHttp().getRequest();
      const user = request.user as
        | { userId?: string; sub?: string; id?: string }
        | undefined;

      if (user) {
        const userId = user.userId ?? user.sub ?? user.id;

        if (userId) {
          return next.handle().pipe(
            tap((responseData) => {
              // Extract metadata from request and response
              const metadata: Record<string, unknown> = {};

              if (options) {
                // Extract from request body
                if (options.body && request.body) {
                  options.body.forEach((key) => {
                    if (request.body[key] !== undefined) {
                      metadata[key] = request.body[key];
                    }
                  });
                }

                // Extract from request params
                if (options.params && request.params) {
                  options.params.forEach((key) => {
                    if (request.params[key] !== undefined) {
                      metadata[key] = request.params[key];
                    }
                  });
                }

                // Extract from request query
                if (options.query && request.query) {
                  options.query.forEach((key) => {
                    if (request.query[key] !== undefined) {
                      metadata[key] = request.query[key];
                    }
                  });
                }

                // Extract from response data (supports nested paths like 'conversation._id')
                if (options.response && responseData) {
                  options.response.forEach((path) => {
                    const value = this.getNestedProperty(responseData, path);
                    if (value !== undefined) {
                      // Use the last part of the path as the key
                      const key = path.split('.').pop() || path;
                      metadata[key] = value;
                    }
                  });
                }
              }

              void this.analyticsService.trackEvent(
                userId,
                ActivityType.FEATURE_USAGE,
                featureName,
                Object.keys(metadata).length > 0 ? metadata : undefined,
              );
            }),
          );
        }
      }
    }

    return next.handle();
  }
}
