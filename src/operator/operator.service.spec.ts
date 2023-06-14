import { Test, TestingModule } from '@nestjs/testing';
import { OperatorService } from './operator.service';
import {ConfigModule} from "@nestjs/config";
import configuration from "../config/configuration";

describe('OperatorService', () => {
  let service: OperatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({

      providers: [OperatorService],
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [configuration],
        }),
      ],
    }).compile();

    service = module.get<OperatorService>(OperatorService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return fee', () => {
    const res = service.estimateFee();
    expect(res.toString()).toEqual('3826400000000');
  });
});
