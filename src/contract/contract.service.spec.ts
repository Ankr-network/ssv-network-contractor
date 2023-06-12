import { Test, TestingModule } from '@nestjs/testing';
import { ContractService } from './contract.service';
import { ConfigModule } from '@nestjs/config';
import configuration from '../config/configuration';
import { raw } from 'express';

describe('ContractService', () => {
  let service: ContractService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          cache: true,
          ignoreEnvFile: true,
          isGlobal: true,
          load: [configuration],
        }),
      ],
      providers: [ContractService],
    }).compile();

    service = module.get<ContractService>(ContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('get validator', async () => {
    const res = await service.getValidator(
      '0x00555a03a8df8da5633c15958d8f08a7adf77de8f92aa5d5b303b489344ac861567c99d5bc4480035fbd28b805f3e40f',
    );
    expect(res).toEqual({
      active: false,
      owner: '0x0000000000000000000000000000000000000000',
    });
  });
});
