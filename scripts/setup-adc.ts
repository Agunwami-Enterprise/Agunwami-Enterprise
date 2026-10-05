/**
 * scripts/setup-adc.ts
 *
 * Automatically provisions local Application Default Credentials (ADC)
 * using the existing Firebase CLI authentication session, eliminating the need
 * to install the standalone Google Cloud CLI (gcloud) for local development.
 *
 * Usage:
 *   npx tsx scripts/setup-adc.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

async function main() {
  console.log('--- Configuring Local Google Cloud ADC for Development ---');

  const homedir = os.homedir();
  const configPath = path.join(homedir, '.config', 'configstore', 'firebase-tools.json');

  if (!fs.existsSync(configPath)) {
    console.error('Error: No Firebase CLI login detected.');
    console.error('Please run `firebase login` first to authenticate with your Google account.');
    process.exit(1);
  }

  const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const refreshToken = fbConfig?.tokens?.refresh_token;
  const userEmail = fbConfig?.user?.email;

  if (!refreshToken) {
    console.error('Error: No refresh token found in Firebase CLI credentials.');
    console.error('Please run `firebase login --reauth` to refresh your session.');
    process.exit(1);
  }

  console.log(`Found active Firebase session for: ${userEmail || 'authenticated user'}`);

  const gcloudDir = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'gcloud')
    : path.join(homedir, '.config', 'gcloud');

  if (!fs.existsSync(gcloudDir)) {
    fs.mkdirSync(gcloudDir, { recursive: true });
  }

  const adcPath = path.join(gcloudDir, 'application_default_credentials.json');
  const adc = {
    client_id: FIREBASE_CLI_CLIENT_ID,
    client_secret: FIREBASE_CLI_CLIENT_SECRET,
    refresh_token: refreshToken,
    type: 'authorized_user',
  };

  fs.writeFileSync(adcPath, JSON.stringify(adc, null, 2), 'utf8');
  console.log(`Successfully generated ADC at:\n  ${adcPath}`);

  // Test token exchange
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: FIREBASE_CLI_CLIENT_ID,
        client_secret: FIREBASE_CLI_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (res.ok) {
      console.log('Verified: OAuth token exchange succeeded! Local Firestore queries are ready.');
    } else {
      console.warn('Warning: Token verification returned status', res.status);
    }
  } catch (err: any) {
    console.warn('Warning: Could not verify token with Google OAuth:', err.message);
  }

  console.log('Setup complete!');
}

main().catch(console.error);
