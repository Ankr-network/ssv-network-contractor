import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { ContractService } from './contract/contract.service';
import { OperatorService } from './operator/operator.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          cache: true,
          ignoreEnvFile: true,
          isGlobal: true,
          load: [configuration],
        }),
      ],
      controllers: [AppController],
      providers: [AppService, ContractService, OperatorService],
    }).compile();
    await ConfigModule.envVariablesLoaded;
    appController = app.get<AppController>(AppController);
    await app.get<OperatorService>(OperatorService).onModuleInit();
    await app.get<ContractService>(ContractService).onModuleInit();
  }, 100000);
});
