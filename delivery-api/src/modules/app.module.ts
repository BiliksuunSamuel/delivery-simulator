import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../configuration';
import { MongooseModule } from '@nestjs/mongoose';
import { loadSchemas } from '../functions/load.schemas';
import controllers from 'src/functions/load.controllers';
import repositories from 'src/functions/load.repositories';
import services from 'src/functions/load.services';
import { JwtStrategy } from 'src/providers/jwt.strategy';
import { LocalStrategy } from 'src/providers/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import constants from 'src/constants';
import { AuthMiddleware } from 'src/middlewares/auth.middleware';
import { RolesGuard } from 'src/providers/roles.guard';
import { TemporalClientModule } from 'nest-temporal-client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
      load: [configuration],
    }),
    MongooseModule.forRoot(configuration().connectionString),
    MongooseModule.forFeature(loadSchemas()),
    JwtModule.register({
      global: true,
      secret: constants().secret,
      signOptions: { expiresIn: '8hrs' },
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
  ],
  controllers: [...controllers],
  providers: [
    ...repositories,
    ...services,
    LocalStrategy,
    JwtStrategy,
    RolesGuard,
  ],
})
export class AppModule {
  //configure middleware to check for authentication
  //you can include and exclude routes as you wish
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'api/authentication/sign-in', method: RequestMethod.POST },
        { path: 'api/authentication/sign-up', method: RequestMethod.POST },
        // Simulator routes are intentionally wide-open; skip JWT processing.
        { path: 'api/v1/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes({
        path: '*',
        method: RequestMethod.ALL,
      });
  }
}
