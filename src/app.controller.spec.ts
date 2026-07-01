import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { DatabaseService } from './database/database.service';
import { ExternalApiService } from './external-api/external-api.service';

describe('AppController', () => {
  let appController: AppController;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockExternalApiService: jest.Mocked<ExternalApiService>;

  beforeEach(async () => {
    mockDatabaseService = {
      query: jest.fn(),
    } as any;

    mockExternalApiService = {
      fetchExternalData: jest.fn(),
    } as any;

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ExternalApiService, useValue: mockExternalApiService },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the running message', async () => {
      mockDatabaseService.query.mockResolvedValue([]);
      const result = await appController.getHello();
      expect(result).toContain(
        'Canonical Logging Example application is running',
      );
      expect(mockDatabaseService.query).toHaveBeenCalledWith('SELECT 1;');
    });
  });
});
