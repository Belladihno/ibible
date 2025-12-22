import { SetMetadata } from '@nestjs/common';

export interface TrackActivityOptions {
  body?: string[];
  query?: string[];
  params?: string[];
  response?: string[]; // Extract from response data
}

export const TRACK_ACTIVITY_KEY = 'track_activity';
export const TRACK_ACTIVITY_OPTIONS_KEY = 'track_activity_options';

export const TrackActivity = (
  featureName: string,
  options?: TrackActivityOptions,
) => {
  return (
    target: object,
    key: string | symbol,
    descriptor: TypedPropertyDescriptor<any>,
  ) => {
    SetMetadata(TRACK_ACTIVITY_KEY, featureName)(target, key, descriptor);
    if (options) {
      SetMetadata(TRACK_ACTIVITY_OPTIONS_KEY, options)(target, key, descriptor);
    }
  };
};
