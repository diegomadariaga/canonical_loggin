import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CanonicalLogStore } from '../common/logging/types';

@Injectable()
export class DatabaseService {
  constructor(private readonly cls: ClsService<CanonicalLogStore>) {}

  async query(sql: string): Promise<any[]> {
    // Increment DB query count in Cls request-scoped store
    const currentCount = this.cls.get('dbQueryCount') || 0;
    this.cls.set('dbQueryCount', currentCount + 1);

    // Simulate query delay (5ms to 40ms)
    const delay = Math.floor(Math.random() * 35) + 5;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return [{ id: 1, rawSql: sql, simulatedTimeMs: delay }];
  }
}
