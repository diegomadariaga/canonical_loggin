import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';
import { CanonicalLogStore } from '../logging/types';

@Injectable()
export class AuthSimulationMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService<CanonicalLogStore>) {}

  use(req: Request, res: Response, next: NextFunction) {
    const userIdHeader =
      req.headers['x-user-id'] || req.headers['x-consumer-id'];
    const authHeader = req.headers['authorization'];

    let userId: string | undefined;

    if (userIdHeader) {
      userId = String(userIdHeader);
    } else if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      // Mock decoding JWT: treat the token contents as user ID
      userId = authHeader.substring(7);
    } else {
      // Fallback for simulation purposes
      userId = 'usr_guest_demo';
    }

    // Save userId to Cls request context
    this.cls.set('userId', userId);

    next();
  }
}
