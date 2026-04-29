import * as dotenv from 'dotenv';

dotenv.config();

export default () => ({
  temporalUrl: process.env.TEMPORAL_URL,
  connectionString: process.env.CONNECTION_STRING,
  // Set when pointing at Temporal Cloud (or any auth-protected cluster).
  // Leave empty for self-hosted / dev clusters with no auth.
  temporalApiKey: process.env.TEMPORAL_API_KEY || '',
});
