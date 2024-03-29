import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SSVNetwork, SSVNetworkViews, SSVToken } from '../generated';
import Web3 from 'web3';
import BN from 'bn.js';
import { ConfigService } from '@nestjs/config';
import SSVNetworkAbi from '../abi/SSVNetwork.json';
import SSVNetworkViewsAbi from '../abi/SSVNetworkViews.json';
import SSVTokenAbi from '../abi/SSVToken.json';
import { AbiItem } from 'web3-utils';
import { HttpProvider } from 'web3-core';
import { NonPayableTx } from '../generated/types';
import { sleep } from '../utils';
import { TransactionReceipt } from 'web3-core/types';
import BigNumber from 'bignumber.js';

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly logger = new Logger(ContractService.name);
  private readonly ssvNetwork: SSVNetwork;
  private readonly ssvToken: SSVToken;
  private readonly ssvNetworkViews: SSVNetworkViews;
  lastTxHash: string;

  networkFee: BigNumber;
  liquidationThresholdPeriod: BigNumber;

  readonly web3: Web3;

  constructor(private readonly configService: ConfigService) {
    this.web3 = new Web3(this.configService.get<string>('RPC_HOST'));
    this.ssvNetwork = new this.web3.eth.Contract(
      SSVNetworkAbi as AbiItem[],
      this.configService.get<string>('SSV_NETWORK_ADDRESS'),
      {},
    ) as any as SSVNetwork;
    this.ssvToken = new this.web3.eth.Contract(
      SSVTokenAbi as AbiItem[],
      this.configService.get<string>('SSV_TOKEN_ADDRESS'),
      {},
    ) as any as SSVToken;
    this.ssvNetworkViews = new this.web3.eth.Contract(
      SSVNetworkViewsAbi as AbiItem[],
      this.configService.get<string>('SSV_NETWORK_VIEWS_ADDRESS'),
      {},
    ) as any as SSVNetworkViews;
  }

  async onModuleInit() {
    const chainId = await this.web3.eth.getChainId();
    this.logger.log(
      `Chain id for ${
        (this.web3.currentProvider as HttpProvider).host
      } is ${chainId}`,
    );

    await this.update();
    setInterval(async () => {
      await this.update();
    }, 1000 * 60 * 60); // each hour
  }

  async getValidator(
    pubkey: string,
  ): Promise<{ owner: string; active: boolean }> {
    if (!pubkey.startsWith('0x')) {
      pubkey = '0x' + pubkey;
    }
    const validator = await this.ssvNetworkViews.methods
      .getValidator(pubkey)
      .call();
    return {
      owner: validator['0'],
      active: validator['1'],
    };
  }

  async approveForNetwork(amount: BigNumber, requestId = -1) {
    // check that we ready to issue transaction
    await this.waitUntilMined(requestId);
    // prepare transaction
    const method = this.ssvToken.methods.approve(
      this.ssvNetwork.options.address,
      amount.toString(10),
    );
    const tx: NonPayableTx = {
      from: this.configService.get<string>('OPERATOR_ADDRESS'),
      to: this.ssvToken.options.address,
      data: method.encodeABI(),
    };
    tx.gas = await method.estimateGas(tx);
    tx.nonce = await this.web3.eth.getTransactionCount(tx.from, 'latest');
    // sign transaction
    this.logger.log(
      `[${requestId}] sending approve for ${
        this.ssvNetwork.options.address
      } of ${amount.toString(10)} SSV`,
    );
    const { rawTransaction, transactionHash } =
      await this.web3.eth.accounts.signTransaction(
        tx as any,
        this.configService.get<string>('OPERATOR_PRIV_KEY'),
      );
    // send transaction
    let receipt: TransactionReceipt;
    try {
      receipt = await this.web3.eth.sendSignedTransaction(rawTransaction);
    } catch (e) {
      this.logger.warn(`[${requestId}] approveForNetwork send failed: ${e}`);
      await sleep(this.configService.get<number>('TX_WAIT_TIME'));
      receipt = await this.web3.eth.getTransactionReceipt(transactionHash);
      if (!receipt || !receipt.status) {
        throw e;
      }
    }

    this.lastTxHash = receipt.transactionHash;
    this.logger.log(
      `[${requestId}] SSV approve for ${amount.toString()} was sent hash: ${
        receipt.transactionHash
      }`,
    );
  }

  async registerValidator(payload: any, requestId = -1) {
    const args = [
      payload.publicKey,
      payload.operatorIds,
      payload.shares,
      payload.amount,
      payload.cluster,
    ] as [
      string | number[],
      (number | string | BN)[],
      string | number[],
      number | string | BN,
      [
        number | string | BN,
        number | string | BN,
        number | string | BN,
        number | string | BN,
        boolean,
      ],
    ];
    // check that we ready to issue transaction
    await this.waitUntilMined(requestId);
    // prepare transaction
    this.logger.log(
      `[${requestId}] sending registerValidator tx ${JSON.stringify(args)}`,
    );
    const tx: NonPayableTx = {
      from: this.configService.get<string>('OPERATOR_ADDRESS'),
      to: this.ssvNetwork.options.address,
      data: this.ssvNetwork.methods.registerValidator(...args).encodeABI(),
    };
    tx.gas = await this.ssvNetwork.methods
      .registerValidator(...args)
      .estimateGas(tx);
    tx.gas += 300000; // observed problem with gas estimation
    tx.nonce = await this.web3.eth.getTransactionCount(tx.from, 'latest');
    // sign transaction
    const { rawTransaction, transactionHash } =
      await this.web3.eth.accounts.signTransaction(
        tx as any,
        this.configService.get<string>('OPERATOR_PRIV_KEY'),
      );
    // send transaction
    let receipt: TransactionReceipt;
    try {
      receipt = await this.web3.eth.sendSignedTransaction(rawTransaction);
    } catch (e) {
      this.logger.warn(`[${requestId}] registerValidator send failed: ${e}`);
      await sleep(this.configService.get<number>('TX_WAIT_TIME'));
      receipt = await this.web3.eth.getTransactionReceipt(transactionHash);
      if (!receipt || !receipt.status) {
        throw e;
      }
    }

    this.lastTxHash = receipt.transactionHash;
    this.logger.log(
      `[${requestId}] registerValidator was sent hash: ${receipt.transactionHash}`,
    );
  }

  async removeValidator(
    publicKey: string,
    operatorIds: number[],
    cluster: [
      number | string | BN,
      number | string | BN,
      number | string | BN,
      number | string | BN,
      boolean,
    ],
    requestId = -1,
  ) {
    // check that we ready to issue transaction
    await this.waitUntilMined(requestId);
    // prepare transaction
    this.logger.log(
      `[${requestId}] sending removeValidator ${publicKey} from ${operatorIds}, ${cluster}`,
    );
    const tx: NonPayableTx = {
      from: this.configService.get<string>('OPERATOR_ADDRESS'),
      to: this.ssvNetwork.options.address,
      data: this.ssvNetwork.methods
        .removeValidator(publicKey, operatorIds, cluster)
        .encodeABI(),
    };
    tx.gas = await this.ssvNetwork.methods
      .removeValidator(publicKey, operatorIds, cluster)
      .estimateGas(tx);
    tx.gas += 100_000;
    tx.nonce = await this.web3.eth.getTransactionCount(tx.from, 'latest');
    // sign transaction
    const { rawTransaction, transactionHash } =
      await this.web3.eth.accounts.signTransaction(
        tx as any,
        this.configService.get<string>('OPERATOR_PRIV_KEY'),
      );
    // send transaction
    let receipt: TransactionReceipt;
    try {
      receipt = await this.web3.eth.sendSignedTransaction(rawTransaction);
    } catch (e) {
      this.logger.warn(`[${requestId}] removeValidator send failed: ${e}`);
      await sleep(this.configService.get<number>('TX_WAIT_TIME'));
      receipt = await this.web3.eth.getTransactionReceipt(transactionHash);
      if (!receipt || !receipt.status) {
        throw e;
      }
    }

    this.lastTxHash = receipt.transactionHash;
    this.logger.log(
      `[${requestId}] removeValidator was sent hash: ${receipt.transactionHash}`,
    );
  }

  async waitUntilMined(requestId: number) {
    let cnt = 0;
    while (this.lastTxHash) {
      await sleep(this.configService.get<number>('TX_WAIT_TIME'));
      try {
        const { status } = await this.web3.eth.getTransactionReceipt(
          this.lastTxHash,
        );
        if (status) {
          this.logger.log(
            `[${requestId}] previous tx ${this.lastTxHash} was mined`,
          );
          this.lastTxHash = '';
          break;
        }
      } catch (e) {
        this.logger.warn(
          `[${requestId}] unable to check latest tx ${this.lastTxHash} with err ${e}`,
        );
      }
      this.logger.warn(
        `[${requestId}] avoiding to send new tx, because previously ${this.lastTxHash} still pending`,
      );

      if (++cnt > 60) {
        const problemHash = this.lastTxHash;
        this.lastTxHash = '';
        throw new Error(
          `[${requestId}] tx ${problemHash} cannot be mined or checked`,
        );
      }
    }

    cnt = 0;
    while (true) {
      const address = this.configService.get<string>('OPERATOR_ADDRESS');

      try {
        const pendingNonce = await this.web3.eth.getTransactionCount(
          address,
          'pending',
        );
        const latestNonce = await this.web3.eth.getTransactionCount(
          address,
          'latest',
        );
        this.logger.log(
          `[${requestId}] checking address nonces ${pendingNonce} and ${latestNonce}`,
        );
        if (pendingNonce == latestNonce) {
          break;
        }
      } catch (e) {
        this.logger.warn(
          `[${requestId}] cannot get nonce for ${address} with err ${e}`,
        );
      }

      if (++cnt > 120) {
        throw new Error(`[${requestId}] nonce of ${address} cannot be changed`);
      }
      await this.waitTx();
    }

    this.logger.log(
      `[${requestId}] there is no pending txs for address ${this.configService.get<string>(
        'OPERATOR_ADDRESS',
      )}`,
    );
  }

  private async waitTx() {
    await sleep(this.configService.get<number>('TX_WAIT_TIME'));
  }

  private async update() {
    const feeStr = await this.ssvNetworkViews.methods.getNetworkFee().call();
    this.networkFee = new BigNumber(feeStr);
    const ltpStr = await this.ssvNetworkViews.methods
      .getLiquidationThresholdPeriod()
      .call();
    this.liquidationThresholdPeriod = new BigNumber(ltpStr);
    this.logger.log(
      `update: network fee is ${this.networkFee.toString()}, ltp is ${this.liquidationThresholdPeriod.toString()}`,
    );
    await this.makeUnlimitedApprove();
  }

  private async makeUnlimitedApprove() {
    const operator = this.configService.get<string>('OPERATOR_ADDRESS');
    const limit = new BigNumber(
      this.web3.utils.toWei(
        this.configService.get<string>('SSV_APPROVE_LIMIT'),
      ),
    );
    const allowance = new BigNumber(
      await this.ssvToken.methods
        .allowance(operator, this.ssvNetwork.options.address)
        .call(),
    );
    if (allowance.lt(limit.div('2'))) {
      this.logger.log(
        `found that approved amount less than 50% of ${limit.toString(
          10,
        )}, need to be increased`,
      );
      this.approveForNetwork(limit).catch((e) => {
        this.logger.error(`approve was failed with err: ${e}`);
      });
    }
    this.logger.log('unlimited approve was sent');
  }
}
