import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { TemporalClientModule } from 'nest-temporal-client';
import { MongooseModule } from '@nestjs/mongoose';
import { loadSchemas } from './functions/load.schemas';
import { TemporalHostModule } from 'nest-temporal-host';
import { DispatchActivities } from './activities/dispatch-activities';
import { WorkflowTaskQueues } from './enums';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    TemporalClientModule.forRoot({
      address: configuration().temporalUrl,
      namespace: 'default',
      // Pass the API key when set; TLS is required by Temporal Cloud
      // whenever apiKey is provided, so we toggle it together.
      ...(configuration().temporalApiKey
        ? { apiKey: configuration().temporalApiKey, tls: true }
        : {}),
    }),
    MongooseModule.forRoot(configuration().connectionString!, {
      retryAttempts: 5,
      retryDelay: 3000,
    }),
    MongooseModule.forFeature(loadSchemas()),
    TemporalHostModule.forRoot({
      connection: {
        address: configuration().temporalUrl,
        ...(configuration().temporalApiKey
          ? { apiKey: configuration().temporalApiKey, tls: true }
          : {}),
      },
      namespace: 'default',
      workers: [
        {
          taskQueue: WorkflowTaskQueues.DISPATCH_TASK_QUEUE,
          workflowsPath: require.resolve('./workflows/dispatch-workflow'),
          activities: [DispatchActivities],
        },
      ],
    }),
  ],
  controllers: [],
  providers: [DispatchActivities],
})
export class AppModule {}
