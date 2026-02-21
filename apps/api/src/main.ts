import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';

function loadEnvironment() {
  const envCandidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps/api/.env'),
    resolve(__dirname, '../.env')
  ];

  for (const envPath of envCandidates) {
    if (!existsSync(envPath)) {
      continue;
    }

    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore unreadable env files; externally supplied env vars still work.
    }
  }
}

async function bootstrap() {
  loadEnvironment();
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}

bootstrap();
