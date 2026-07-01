import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { CanonicalLogStore } from '../logging/types';

@Injectable()
export class CanonicalLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('CanonicalLog');

  constructor(private readonly cls: ClsService<CanonicalLogStore>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    // 1. Establish/Extract Trace ID using native crypto.randomUUID()
    const traceId = (req.headers['x-trace-id'] ||
      req.headers['x-request-id'] ||
      randomUUID()) as string;

    // Set Trace ID on the response header so clients can reference it
    res.setHeader('x-trace-id', traceId);

    // 2. Initialize request state in the CLS context store
    this.cls.set('traceId', traceId);
    this.cls.set('dbQueryCount', 0);
    this.cls.set('externalCallDurationMs', 0);
    this.cls.set('hasError', false);

    // 3. Mark the start time using high-resolution real-time
    const hrStart = process.hrtime();

    return next.handle().pipe(
      tap(() => {
        // Success execution path
        this.emitCanonicalLog(req, res, hrStart);
      }),
      catchError((err: any) => {
        // Error execution path - record error details in CLS
        this.cls.set('hasError', true);
        this.cls.set('errorMessage', err.message || 'Unknown error');
        this.cls.set('errorStack', err.stack);

        this.emitCanonicalLog(req, res, hrStart, err);

        // Rethrow the error so that NestJS standard exception filters can still execute
        return throwError(() => err);
      }),
    );
  }

  private emitCanonicalLog(
    req: Request,
    res: Response,
    hrStart: [number, number],
    error?: any,
  ) {
    // Calculate total request execution latency in milliseconds
    const hrDiff = process.hrtime(hrStart);
    const latencyMs = Number(
      (hrDiff[0] * 1000 + hrDiff[1] / 1000000).toFixed(2),
    );

    // Get final status code, mapping non-HttpException errors to 500
    let statusCode = res.statusCode;
    if (error) {
      statusCode = error instanceof HttpException ? error.getStatus() : 500;
    }

    // Safely extract request size from content-length header
    const reqSizeBytes = req.headers['content-length']
      ? parseInt(req.headers['content-length'] as string, 10)
      : 0;

    // Safely extract response size from response headers
    const resSizeBytesHeader = res.getHeader('content-length');
    const resSizeBytes = resSizeBytesHeader
      ? parseInt(resSizeBytesHeader as string, 10)
      : 0;

    // Compile variables from Cls context
    const traceId = this.cls.get('traceId');
    const userId = this.cls.get('userId');
    const dbQueryCount = this.cls.get('dbQueryCount') || 0;
    const externalCallDurationMs = Number(
      (this.cls.get('externalCallDurationMs') || 0).toFixed(2),
    );

    // Form the structured Canonical Log Line payload
    const logPayload = {
      trace_id: traceId,
      http: {
        method: req.method,
        path: req.url,
        status_code: statusCode,
        latency_ms: latencyMs,
        user_agent: req.headers['user-agent'] || 'unknown',
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        request_size_bytes: reqSizeBytes,
        response_size_bytes: resSizeBytes,
      },
      user: {
        id: userId,
      },
      metrics: {
        db_query_count: dbQueryCount,
        external_call_duration_ms: externalCallDurationMs,
      },
      ...(error && {
        error: {
          message: error.message || 'Unknown error',
          stack: error.stack,
        },
      }),
    };

    // Emit the single canonical log line.
    // If it's a 5xx error, log as error; otherwise log as info.
    if (statusCode >= 500) {
      this.logger.error(logPayload, 'request_completed_with_error');
    } else {
      this.logger.log(logPayload, 'request_completed');
    }
  }
}
