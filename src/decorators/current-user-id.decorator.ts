// import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// export const CurrentUserId = createParamDecorator(
//   (data: unknown, ctx: ExecutionContext): string => {
//     const request = ctx.switchToHttp().getRequest();
//     return request.user?.id || request.user?.sub; // 'sub' is common in JWT payloads
//   },
// );
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  user?: {
    id?: string;
    sub?: string;
  };
}

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user?.id ?? request.user?.sub;
  },
);
