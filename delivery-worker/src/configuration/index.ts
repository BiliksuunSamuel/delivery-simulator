import * as dotenv from 'dotenv';

dotenv.config();

export default () => ({
  temporalUrl: process.env.TEMPORAL_URL,
  connectionString: process.env.CONNECTION_STRING,
});
