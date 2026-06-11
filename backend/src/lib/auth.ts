import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { bearer } from 'better-auth/plugins';

const trustedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'mysql',
    schema: schema
  }),
  emailAndPassword: {
    enabled: true
  },
  trustedOrigins,
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'siswa'
      }
    }
  },
  plugins: [
    bearer()
  ]
});
