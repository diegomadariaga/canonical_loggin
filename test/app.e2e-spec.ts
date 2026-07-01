import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import { AppModule } from './../src/app.module';

// Use require for supertest to bypass any esModuleInterop TS compilation mismatch in test runner
const request = require('supertest');

describe('Canonical Logging (e2e)', () => {
  let app: INestApplication;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let logs: any[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    logs = [];

    // Spy on NestJS Logger log and error methods to capture canonical log lines.
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((message: any, context?: string) => {
        if (
          context === 'CanonicalLog' ||
          (typeof message === 'object' && message?.trace_id)
        ) {
          logs.push(message);
        }
      });

    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation((message: any, trace?: string, context?: string) => {
        if (
          context === 'CanonicalLog' ||
          trace === 'CanonicalLog' ||
          (typeof message === 'object' && message?.trace_id)
        ) {
          logs.push(message);
        }
      });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('GET / should emit a canonical log line with DB query count 1', async () => {
    const response = await request(app.getHttpServer()).get('/').expect(200);

    expect(response.text).toContain(
      'Canonical Logging Example application is running',
    );
    expect(response.headers['x-trace-id']).toBeDefined();

    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.trace_id).toBe(response.headers['x-trace-id']);
    expect(log.http.method).toBe('GET');
    expect(log.http.path).toBe('/');
    expect(log.http.status_code).toBe(200);
    expect(log.metrics.db_query_count).toBe(1);
    expect(log.metrics.external_call_duration_ms).toBe(0);
    expect(log.user.id).toBe('usr_guest_demo');
  });

  it('GET /success should emit a canonical log with 3 DB queries and external API metrics', async () => {
    const response = await request(app.getHttpServer())
      .get('/success')
      .expect(200);

    expect(response.body.message).toBe('Operation succeeded');
    expect(response.headers['x-trace-id']).toBeDefined();

    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.trace_id).toBe(response.headers['x-trace-id']);
    expect(log.http.method).toBe('GET');
    expect(log.http.path).toBe('/success');
    expect(log.http.status_code).toBe(200);
    expect(log.metrics.db_query_count).toBe(3);
    expect(log.metrics.external_call_duration_ms).toBeGreaterThan(0);
  });

  it('GET /error should log an error canonical line with status 500 and stack trace', async () => {
    const response = await request(app.getHttpServer())
      .get('/error')
      .expect(500);

    expect(response.body.message).toBe(
      'An unexpected database deadlock has occurred.',
    );
    expect(response.headers['x-trace-id']).toBeDefined();

    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.trace_id).toBe(response.headers['x-trace-id']);
    expect(log.http.method).toBe('GET');
    expect(log.http.path).toBe('/error');
    expect(log.http.status_code).toBe(500);
    expect(log.metrics.db_query_count).toBe(1);
    expect(log.error).toBeDefined();
    expect(log.error.message).toBe(
      'An unexpected database deadlock has occurred.',
    );
    expect(log.error.stack).toBeDefined();
  });

  it('GET /error?type=bad_request should log a canonical line with status 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/error?type=bad_request')
      .expect(400);

    expect(response.headers['x-trace-id']).toBeDefined();

    expect(logs.length).toBe(1);
    const log = logs[0];
    expect(log.trace_id).toBe(response.headers['x-trace-id']);
    expect(log.http.method).toBe('GET');
    expect(log.http.path).toBe('/error?type=bad_request');
    expect(log.http.status_code).toBe(400);
    expect(log.metrics.db_query_count).toBe(0);
    expect(log.error).toBeDefined();
    expect(log.error.message).toBe('Invalid query parameters provided.');
  });
});
