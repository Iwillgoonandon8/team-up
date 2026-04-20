import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../utils/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown>; userId?: string }>();
    const rawUserId = request.headers['x-user-id'];
    const userId = typeof rawUserId === 'string' ? rawUserId.trim() : '';

    if (!userId) {
      throw new UnauthorizedException('Missing x-user-id header');
    }

    request.userId = userId;
    return true;
  }
}
