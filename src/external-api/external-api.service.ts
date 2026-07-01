import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CanonicalLogStore } from '../common/logging/types';

@Injectable()
export class ExternalApiService {
  constructor(private readonly cls: ClsService<CanonicalLogStore>) {}

  async fetchExternalData(endpoint: string): Promise<any> {
    const startTime = process.hrtime();

    // Simulate external network delay (50ms to 150ms)
    const delay = Math.floor(Math.random() * 100) + 50;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const diff = process.hrtime(startTime);
    const elapsedMs = diff[0] * 1000 + diff[1] / 1000000;

    // Accumulate the duration in Cls context
    const currentDuration = this.cls.get('externalCallDurationMs') || 0;
    this.cls.set('externalCallDurationMs', currentDuration + elapsedMs);

    return {
      endpoint,
      success: true,
      simulatedTimeMs: Number(elapsedMs.toFixed(2)),
    };
  }
}
