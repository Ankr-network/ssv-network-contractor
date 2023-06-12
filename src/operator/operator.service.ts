import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Client } from '../api/client';
import { Operator } from '../api/types';
import { ConfigService } from '@nestjs/config';
import BigNumber from 'bignumber.js';
import BN from 'bn.js';

@Injectable()
export class OperatorService implements OnModuleInit {
  private readonly logger = new Logger(OperatorService.name);
  private readonly api: Client;
  private _operators: Operator[] = [];

  constructor(private readonly configService: ConfigService) {
    this.api = new Client(
      this.configService.get<string>('SSV_API'),
      this.configService.get<string>('CONSENSUS_NETWORK'),
    );
  }

  async onModuleInit() {
    // health check
    await this.api.v3.health();
    await this.update();
    setInterval(async () => {
      await this.update();
    }, 1000 * 60 * 60 * 4); // once per 4 hours
  }

  getOperatorIds(): number[] {
    return this.operators.map((op) => op.id);
  }

  getOperatorKeys(): string[] {
    return this.operators.map((op) => op.public_key);
  }

  get operators() {
    return this._operators;
  }

  async getCluster(): Promise<
    [
      number | string | BN,
      number | string | BN,
      number | string | BN,
      number | string | BN,
      boolean,
    ]
  > {
    const operatorIds = this.getOperatorIds();
    const exists = await this.api.v3.getClusterOwner(
      this.configService.get<string>('OPERATOR_ADDRESS'),
    );
    let clusterParam: [
      number | string | BN,
      number | string | BN,
      number | string | BN,
      number | string | BN,
      boolean,
    ] = [
      0, // validatorCount
      0, // networkFeeIndex
      0, // index
      '0', // balance
      true, // active
    ];

    for (const existCluster of exists.clusters.filter((v) => v.active)) {
      if (existCluster.operators.length === operatorIds.length) {
        const sortedC = existCluster.operators.sort((a, b) => a - b);
        const sortedO = operatorIds.sort((a, b) => a - b);
        const isEq = sortedC.every((val, i) => val === sortedO[i]);
        if (isEq) {
          clusterParam = [
            existCluster.validator_count,
            existCluster.network_fee_index,
            existCluster.index,
            existCluster.balance,
            true,
          ];
          break;
        }
      }
    }
    return clusterParam;
  }

  estimateFee(): BigNumber {
    let sum = new BigNumber(0);
    for (const operator of this.operators) {
      sum = sum.plus(operator.fee);
    }
    return this.operators.reduce(
      (sum, op) => sum.plus(op.fee),
      new BigNumber(0),
    );
  }

  async estimateLiquidation(clusterId: number | string) {
    this.logger.log(`estimate operation fee for cluster: ${clusterId}`);

    const { cluster } = await this.api.v3.getCluster(clusterId);

    this.logger.log(`balance: ${cluster.balance}`);
    this.logger.log(`operators: ${cluster.operators}`);
    this.logger.log(`validator count: ${cluster.validatorCount}`);

    let feeSum = new BigNumber(0);
    for (const id of cluster.operators) {
      const operator = await this.api.v3.getOperator(id);
      const fee = new BigNumber(operator.fee);
      feeSum = feeSum.plus(fee);
    }

    const remainingDays = new BigNumber(cluster.balance)
      .div(feeSum)
      .div(cluster.validatorCount)
      .div('7000') // blocks per day
      .minus(30); // ltp ???
    this.logger.log(`remaining days: ${remainingDays}`);

    return remainingDays;
  }

  private async update() {
    const operatorIds = this.configService.get<string>('OPERATOR_IDS');
    const temp = [];
    for (const idStr of operatorIds.split(',')) {
      // operator ids can be presented as number, because id is uint32
      const id = parseInt(idStr, 10);
      const op = await this.api.v3.getOperator(id);
      temp.push(op);
    }
    this._operators = temp;
    this.logger.log(
      `operators updated ${JSON.stringify(this.getOperatorIds())}`,
    );
  }
}
