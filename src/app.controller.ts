import { Controller, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';
import { RegisterValidatorKeyRequest } from './generated/com/ankr/ssvnetworkcontractor/RegisterValidatorKeyRequest';
import { RegisterValidatorKeyReply } from './generated/com/ankr/ssvnetworkcontractor/RegisterValidatorKeyReply';
import { SSVKeys } from 'ssv-keys';
import { RemoveValidatorKeyRequest } from './generated/com/ankr/ssvnetworkcontractor/RemoveValidatorKeyRequest';
import { RemoveValidatorKeyReply } from './generated/com/ankr/ssvnetworkcontractor/RemoveValidatorKeyReply';
import { IsValidatorRegisteredRequest } from './generated/com/ankr/ssvnetworkcontractor/IsValidatorRegisteredRequest';
import { IsValidatorRegisteredReply } from './generated/com/ankr/ssvnetworkcontractor/IsValidatorRegisteredReply';

@Controller()
export class AppController {
  private readonly ssvKeys;
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly service: AppService) {
    this.ssvKeys = new SSVKeys();
  }

  @GrpcMethod('SSVNetworkContractor', 'RegisterValidatorKey')
  async registerValidatorKey(
    data: RegisterValidatorKeyRequest,
    metadata?: Metadata,
    call?: ServerUnaryCall<any, any>,
  ): Promise<RegisterValidatorKeyReply> {
    const requestId = Math.floor(Math.random() * 1_000_000);
    this.logger.log(
      `Got registerValidatorKey() request, request id is ${requestId}`,
    );
    try {
      await this.service.registerValidator(data.keystore, requestId);
    } catch (e) {
      this.logger.error(`[${requestId}] failed to registerValidatorKey: ${e}`);
      throw new RpcException(e.toString());
    }
    return {};
  }

  @GrpcMethod('SSVNetworkContractor', 'RemoveValidatorKey')
  async removeValidatorKey(
    data: RemoveValidatorKeyRequest,
  ): Promise<RemoveValidatorKeyReply> {
    const requestId = Math.floor(Math.random() * 1_000_000);
    this.logger.log(
      `Got RemoveValidatorKey() request, request id is ${requestId}`,
    );
    try {
      await this.service.removeValidator(data.pubkey, requestId);
    } catch (e) {
      this.logger.error(`[${requestId}] failed to removeValidatorKey: ${e}`);
      throw new RpcException(e.toString());
    }
    return {};
  }

  @GrpcMethod('SSVNetworkContractor', 'IsValidatorRegistered')
  async isRegistered(
    data: IsValidatorRegisteredRequest,
  ): Promise<IsValidatorRegisteredReply> {
    const requestId = Math.floor(Math.random() * 1_000_000);
    this.logger.log(`Got isRegistered request for ${data.pubkey}`);
    try {
      return {
        registered: await this.service.isValidatorRegistered(data.pubkey),
      };
    } catch (e) {
      this.logger.error(`[${requestId}] failed to get isRegistered: ${e}`);
      throw new RpcException(e.toString());
    }
  }
}
