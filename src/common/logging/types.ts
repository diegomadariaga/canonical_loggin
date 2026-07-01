import { ClsStore } from 'nestjs-cls';

export interface CanonicalLogStore extends ClsStore {
  traceId: string;
  userId?: string;
  dbQueryCount: number;
  externalCallDurationMs: number;
  hasError: boolean;
  errorMessage?: string;
  errorStack?: string;
}
