import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  await app.init().then(() => {
    console.log('Temporal Worker Application is running!');
  });
}
bootstrap().catch((err) => {
  console.error('Error starting Temporal Worker Application:', err);
  process.exit(1);
});
