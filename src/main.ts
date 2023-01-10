import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';

async function bootstrap() {
  await ConfigModule.envVariablesLoaded;
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'com.ankr.ssvnetworkcontractor',
        protoPath: join(__dirname, '../proto/ssv-network-contractor.proto'),
        url: process.env.GRPC_ADDRESS,
      },
    },
  );
  await app.listen();
}
bootstrap();
