import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EthereumKeyStore, SSVKeys, EncryptShare } from 'ssv-keys';

import { ConfigService } from '@nestjs/config';
import BN from 'bn.js';
import { SSVOperator } from './api/types';
import { Client } from './api/client';
import { ContractService } from './contract/contract.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);
  private readonly api: Client;
  private readonly ssvKeys = new SSVKeys();

  // TODO: observe fee updates
  private readonly operators: SSVOperator[] = [];

  constructor(
    private readonly configService: ConfigService,
    readonly contractService: ContractService,
  ) {
    this.api = new Client(this.configService.get<string>('SSV_API'));
  }

  async onModuleInit() {
    const operatorIds = this.configService.get<string>('OPERATOR_IDS');
    for (const idStr of operatorIds.split(',')) {
      // operator ids can be presented as number, because id is uint32
      const id = parseInt(idStr, 10);
      const op = await this.api.getOperator(id);
      this.operators.push(op);
    }
    this.logger.log(
      `operators initialized ${JSON.stringify(this.getOperatorIds())}`,
    );
  }

  async getKeyShares(privateKey: string): Promise<{
    sharePublicKeys: string[];
    sharePrivateKeys: string[];
    validatorPublicKey: string;
  }> {
    const threshold = await this.ssvKeys.createThreshold(
      privateKey,
      this.getOperatorIds(),
    );
    const shares = await this.ssvKeys.encryptShares(
      this.getOperatorKeys(),
      threshold.shares,
    );

    const sharePublicKeys: string[] = shares.map(
      (share: EncryptShare) => share.publicKey,
    );
    const sharePrivateKeys: string[] = this.ssvKeys.abiEncode(
      shares,
      'privateKey',
    );

    return {
      validatorPublicKey: threshold.validatorPublicKey,
      sharePublicKeys,
      sharePrivateKeys,
    };
  }

  async unpackKeystore(raw: string): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    const keystore = new EthereumKeyStore(raw);
    return {
      publicKey: keystore.getPublicKey(),
      privateKey: await keystore.getPrivateKey(
        this.configService.get<string>('KEYSTORE_PASSWORD'),
      ),
    };
  }

  /**
   * the formula of funding described here
   * https://docs.ssv.network/developers/integration-guides/staking-services#validator-funding
   */
  async getTokenAmount(): Promise<BN> {
    const requiredFunding = this.getTotalOperatorsFee().add(
      this.contractService.networkFee,
    );
    const requiredForNetwork = this.contractService.networkFee.mul(
      new BN(this.configService.get<number>('OPERATION_PERIOD')),
    );
    return requiredFunding
      .mul(this.contractService.liquidationThresholdPeriod)
      .add(requiredForNetwork);
  }

  getOperatorIds(): number[] {
    return this.operators.map((op) => op.id);
  }

  getOperatorKeys(): string[] {
    return this.operators.map((op) => op.public_key);
  }

  // TODO: update operators to have actual fee
  getTotalOperatorsFee(): BN {
    const sum = new BN(0);
    return this.operators.reduce((prev, op) => prev.add(new BN(op.fee)), sum);
  }
}
