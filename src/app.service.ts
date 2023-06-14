import { Injectable, Logger } from '@nestjs/common';
import { KeyShares, SSVKeys } from 'ssv-keys';

import { ConfigService } from '@nestjs/config';
import { ContractService } from './contract/contract.service';
import { OperatorService } from './operator/operator.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly ssvKeys = new SSVKeys();

  constructor(
    private readonly configService: ConfigService,
    readonly contractService: ContractService,
    readonly operatorService: OperatorService,
  ) {}

  async registerValidator(keystore: string, requestId = -1) {
    const { privateKey, publicKey } = await this.ssvKeys.extractKeys(
      keystore,
      this.configService.get<string>('KEYSTORE_PASSWORD'),
    );

    const isRegistered = await this.isValidatorRegistered(publicKey);
    if (isRegistered) {
      throw new Error(`validator ${publicKey} is registered`);
    }

    const operators = this.prepareOperators();
    const encryptedShares = await this.ssvKeys.buildShares(
      privateKey,
      operators,
    );
    const keyShares = new KeyShares();
    const payload = await keyShares.buildPayload({
      publicKey,
      operators,
      encryptedShares,
    });

    payload.amount = (await this.getTokenAmount()).toString(10);

    // wait until mined to know the latest cluster state
    await this.contractService.waitUntilMined(requestId);

    payload.cluster = await this.operatorService.getCluster();
    await this.contractService.registerValidator(payload, requestId);
  }

  async removeValidator(pubkey: string, requestId = -1) {
    const isRegistered = await this.isValidatorRegistered(pubkey);
    if (!isRegistered) {
      throw new Error(`validator ${pubkey} not registered`);
    }

    const operators = this.operatorService.getOperatorIds();

    // wait until mined to know the latest cluster state
    await this.contractService.waitUntilMined(requestId);

    const cluster = await this.operatorService.getCluster();
    await this.contractService.removeValidator(
      pubkey,
      operators,
      cluster,
      requestId,
    );
  }

  /**
   * (sum of operators fee + network fee) * (operational period in blocks + ltp)
   */
  async getTokenAmount(): Promise<BigNumber> {
    const networkFee = this.contractService.networkFee;
    const requiredFunding = this.operatorService.estimateFee().plus(networkFee);

    const ltp = this.contractService.liquidationThresholdPeriod;
    const opPeriod = new BigNumber(
      this.configService.get<number>('OPERATION_PERIOD'),
    );
    const totalPeriod = ltp.plus(opPeriod);

    return requiredFunding.multipliedBy(totalPeriod);
  }

  async isValidatorRegistered(pubkey: string): Promise<boolean> {
    const { active } = await this.contractService.getValidator(pubkey);
    return active;
  }

  prepareOperators() {
    return this.operatorService.operators.map((v) => ({
      id: v.id,
      publicKey: v.public_key,
    }));
  }
}
