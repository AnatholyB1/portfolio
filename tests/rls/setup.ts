// Guard executed before every RLS test file. Aborts the run (no network call)
// unless the target is an explicitly allowed, non-production Supabase branch.
const PROD_REF = 'ubxllsvanurkwkohzxau';

const required = [
  'SV_TEST_ALLOW',
  'SV_TEST_SUPABASE_URL',
  'SV_TEST_PUBLISHABLE_KEY',
  'SV_TEST_SECRET_KEY',
] as const;

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`RLS tests refused: ${name} is not set (see .env.test.local)`);
  }
}

if (process.env.SV_TEST_ALLOW !== '1') {
  throw new Error('RLS tests refused: SV_TEST_ALLOW must be exactly "1"');
}

const url = process.env.SV_TEST_SUPABASE_URL as string;
const ref = process.env.SV_TEST_PROJECT_REF ?? '';
if (url.includes(PROD_REF) || ref.includes(PROD_REF)) {
  throw new Error(`RLS tests refused: target contains production ref ${PROD_REF} (D-16)`);
}
