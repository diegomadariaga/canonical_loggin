import {
  Controller,
  Get,
  Post,
  Body,
  BadRequestException,
  InternalServerErrorException,
  Query,
} from '@nestjs/common';
import { DatabaseService } from './database/database.service';
import { ExternalApiService } from './external-api/external-api.service';

@Controller()
export class AppController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly externalApiService: ExternalApiService,
  ) {}

  @Get()
  async getHello(): Promise<string> {
    // Run a single simulated query
    await this.databaseService.query('SELECT 1;');
    return 'Canonical Logging Example application is running. Use /success, /post-data, /slow, or /error to see logs.';
  }

  @Get('success')
  async getSuccess(): Promise<any> {
    // Simulate multiple DB queries
    await this.databaseService.query('SELECT * FROM users WHERE id = 1;');
    await this.databaseService.query(
      'SELECT * FROM accounts WHERE user_id = 1;',
    );
    await this.databaseService.query(
      'UPDATE users SET last_login = NOW() WHERE id = 1;',
    );

    // Simulate external API calls
    const profile = await this.externalApiService.fetchExternalData(
      'https://api.github.com/users/github',
    );
    const repos = await this.externalApiService.fetchExternalData(
      'https://api.github.com/users/github/repos',
    );

    return {
      message: 'Operation succeeded',
      profile,
      repos,
    };
  }

  @Post('post-data')
  async postData(@Body() body: any): Promise<any> {
    // Perform simulated write
    await this.databaseService.query(
      `INSERT INTO logs (data) VALUES ('${JSON.stringify(body)}');`,
    );
    return {
      received: true,
      data: body,
    };
  }

  @Get('slow')
  async getSlow(@Query('delay') delayString?: string): Promise<any> {
    const delay = delayString ? parseInt(delayString, 10) : 500;

    // Simulate custom processing time
    await new Promise((resolve) => setTimeout(resolve, delay));

    await this.databaseService.query('SELECT pg_sleep(0.5);');

    return {
      message: `Completed after a simulated ${delay}ms execution pause`,
      customDelayMs: delay,
    };
  }

  @Get('error')
  async getError(@Query('type') type?: string): Promise<any> {
    if (type === 'bad_request') {
      throw new BadRequestException('Invalid query parameters provided.');
    }

    // Simulate DB query before failing
    await this.databaseService.query('SELECT * FROM users;');

    throw new InternalServerErrorException(
      'An unexpected database deadlock has occurred.',
    );
  }
}
