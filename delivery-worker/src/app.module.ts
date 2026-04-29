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
    }),
    MongooseModule.forRoot(configuration().connectionString!, {
      retryAttempts: 5,
      retryDelay: 3000,
    }),
    MongooseModule.forFeature(loadSchemas()),
    TemporalHostModule.forRoot({
      connection: {
        address: configuration().temporalUrl,
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
