import * as dotenv from 'dotenv';

dotenv.config();

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  connectionString: process.env.CONNECTION_STRING,
  jwtSecret: process.env.JWT_SECRET,
  temporalUrl: process.env.TEMPORAL_URL || 'localhost:7233',
  // Set when pointing at Temporal Cloud (or any auth-protected cluster).
  // Leave empty for self-hosted / dev clusters with no auth.
  temporalApiKey: process.env.TEMPORAL_API_KEY || '',
});
