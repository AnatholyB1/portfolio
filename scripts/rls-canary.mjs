// Mutation canary (D-16): weaken a policy / disable RLS on the TEST BRANCH,
// require the isolation suite to go RED, then restore and require GREEN.
// Refuses to run unless SV_TEST_ALLOW=1 and the target is not production.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const PROD_REF = 'ubxllsvanurkwkohzxau';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvFile('.env.test.local');

const { SV_TEST_ALLOW, SV_TEST_SUPABASE_URL = '', SV_TEST_PROJECT_REF = '', SV_TEST_DB_URL = '' } = process.env;
if (SV_TEST_ALLOW !== '1') {
  console.error('rls-canary refused: SV_TEST_ALLOW must be 1');
  process.exit(1);
}
if (!SV_TEST_DB_URL || !SV_TEST_PROJECT_REF) {
  console.error('rls-canary refused: SV_TEST_DB_URL and SV_TEST_PROJECT_REF are required');
  process.exit(1);
}
if ([SV_TEST_SUPABASE_URL, SV_TEST_PROJECT_REF, SV_TEST_DB_URL].some((v) => v.includes(PROD_REF))) {
  console.error(`rls-canary refused: target references production (${PROD_REF})`);
  process.exit(1);
}

const isWin = process.platform === 'win32';

function sql(statement) {
  // With shell:true on Windows, args are joined unquoted: quote them (statements hold no double quotes).
  const q = (s) => (isWin ? `"${s}"` : s);
  const r = spawnSync('supabase', ['db', 'query', '--db-url', q(SV_TEST_DB_URL), q(statement)], {
    stdio: 'inherit',
    shell: isWin,
  });
  if (r.status !== 0) throw new Error(`SQL failed: ${statement}`);
}

function runSuite(file = 'isolation') {
  const r = spawnSync('npm', ['run', 'test:rls', '--', file], { stdio: 'inherit', shell: isWin });
  return r.status === 0;
}

const results = [];
function expect(label, actual, wanted) {
  results.push({ label, wanted: wanted ? 'GREEN' : 'RED', actual: actual ? 'GREEN' : 'RED', ok: actual === wanted });
}

const scenario = process.argv[2] ?? 'all';
if (!['all', 'isolation', 'sv_leads'].includes(scenario)) {
  console.error('usage: rls-canary.mjs [all|isolation|sv_leads]');
  process.exit(1);
}

try {
  if (scenario === 'all' || scenario === 'isolation') {
    expect('A. baseline suite', runSuite(), true);

    try {
      sql('create policy rls_canary_open on public.sv_clients for select to authenticated using (true);');
      expect('B. policy weakened (using true)', runSuite(), false);
    } finally {
      sql('drop policy if exists rls_canary_open on public.sv_clients');
    }

    try {
      sql('alter table public.sv_client_members disable row level security');
      sql('grant select on public.sv_client_members to anon');
      expect('C. RLS disabled on sv_client_members', runSuite(), false);
    } finally {
      sql('alter table public.sv_client_members enable row level security');
      sql('revoke all on public.sv_client_members from anon');
      sql('revoke all on public.sv_client_members from authenticated');
      sql('grant select on public.sv_client_members to authenticated');
    }

    expect('D. restored suite', runSuite(), true);
  }

  if (scenario === 'all' || scenario === 'sv_leads') {
    // Phase 11: weaken the admin select policy on sv_leads, the leads suite must go RED.
    expect('E. leads baseline suite', runSuite('leads.rls'), true);
    try {
      sql('drop policy if exists sv_leads_admin_read on public.sv_leads');
      sql('create policy sv_leads_admin_read on public.sv_leads for select to authenticated using (true)');
      expect('F. sv_leads policy weakened (using true)', runSuite('leads.rls'), false);
    } finally {
      sql('drop policy if exists sv_leads_admin_read on public.sv_leads');
      sql('create policy sv_leads_admin_read on public.sv_leads for select to authenticated using ((select sv_private.is_admin()))');
    }
    expect('G. sv_leads policy restored', runSuite('leads.rls'), true);
  }
} catch (err) {
  console.error(String(err));
  results.push({ label: 'canary aborted', wanted: '-', actual: 'ERROR', ok: false });
}

console.log('\nCanary results');
console.log('step'.padEnd(42), 'expected'.padEnd(9), 'actual'.padEnd(9), 'result');
for (const r of results) console.log(r.label.padEnd(42), r.wanted.padEnd(9), r.actual.padEnd(9), r.ok ? 'PASS' : 'FAIL');
process.exit(results.every((r) => r.ok) ? 0 : 1);
