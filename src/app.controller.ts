import { Controller, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { RegisterValidatorKeyRequest } from './generated/com/ankr/ssvnetworkcontractor/RegisterValidatorKeyRequest';
import { RegisterValidatorKeyReply } from './generated/com/ankr/ssvnetworkcontractor/RegisterValidatorKeyReply';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppService.name);
  constructor(private readonly service: AppService) {}

  private counter = 0;

  @GrpcMethod('SSVNetworkContractor', 'RegisterValidatorKey')
  async registerValidatorKey(
    data: RegisterValidatorKeyRequest,
    metadata?: Metadata,
    call?: ServerUnaryCall<any, any>,
  ): Promise<RegisterValidatorKeyReply> {
    const requestId = this.counter++;
    this.logger.log(
      `Got registerValidatorKey() request, request id is ${requestId}; keystore: ${JSON.stringify(
        data,
      )}`,
    );
    try {
      const { privateKey } = await this.service.unpackKeystore(data.keystore);
      const { sharePublicKeys, sharePrivateKeys, validatorPublicKey } =
        await this.service.getKeyShares(privateKey);
      const amount = await this.service.getTokenAmount();
      const operatorIds = this.service.getOperatorIds();
      await this.service.contractService.registerValidator(
        validatorPublicKey,
        sharePublicKeys,
        sharePrivateKeys,
        operatorIds,
        amount,
        requestId,
      );
    } catch (e) {
      this.logger.error(`[${requestId}] failed to registerValidatorKey: ${e}`);
      throw new RpcException(e.toString());
    }
    return {};
  }
}
