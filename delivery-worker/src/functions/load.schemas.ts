import { readdirSync } from 'fs';
import { join } from 'path';
import { Logger, Type } from '@nestjs/common';
import { SchemaFactory } from '@nestjs/mongoose';

const SCHEMA_FOLDER = join(__dirname, '../schemas');

export function loadSchemas(): { name: string; schema: any }[] {
  const logger = new Logger('loadSchemas');
  const schemas: any[] = [];

  try {
    const files = readdirSync(SCHEMA_FOLDER).filter((file) =>
      file.endsWith('.schema.js'),
    );

    for (const file of files) {
      const modulePath = join(SCHEMA_FOLDER, file);
      const module = require(modulePath);

      Object.keys(module).forEach((key) => {
        const entity = module[key];
        if (
          typeof entity === 'function' &&
          !key.toLowerCase().includes('schema') &&
          !key.toLowerCase().startsWith('configure')
        ) {
          const schema = SchemaFactory.createForClass(entity as Type<any>);

          //schema configuration hook name:
          const name = 'configure' + key;

          if (typeof module[name] === 'function') {
            module[name](schema);
            logger.debug(`Applied custom config for schema: ${key}`);
          }
          logger.debug(`✅ Registering schema: ${key}`);
          schemas.push({
            name: key.replace('Schema', ''),
            schema,
          });
        }
      });
    }
  } catch (error) {
    logger.error('Error loading schemas:', error);
  }
  logger.debug(`Loaded ${schemas.length} schemas`);
  return schemas;
}
