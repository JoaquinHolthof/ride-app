// MANUAL ONLY: performs real Data API writes with TWO user sessions, never SQL/admin keys.
// Run after reading docs/FAVOURITES_SETUP.md. Not included in npm test.
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('node:crypto');
const { createInterface } = require('node:readline');
const { Writable } = require('node:stream');

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
  if (!url?.startsWith('https://') || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? '')) {
    throw new Error('Use the HTTPS project URL and publishable key from .env.local.');
  }
  if (!process.stdin.isTTY) throw new Error('Run in an interactive terminal; do not pipe account credentials.');
  let muted = false;
  const output = new Writable({ write(chunk, encoding, done) { if (!muted) process.stdout.write(chunk, encoding); done(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const ask = (label, secret = false) => new Promise(resolve => {
    process.stdout.write(label); muted = secret;
    rl.question('', answer => { muted = false; if (secret) process.stdout.write('\n'); resolve(answer); });
  });
  const clients = [0, 1, 2].map(() => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
  const ids = [];
  const marker = `ride-rls-check-${randomUUID()}`, forged = `${marker}-forged`;
  const check = (condition, label) => { if (!condition) throw new Error(`FAILED: ${label}`); process.stdout.write(`PASS: ${label}\n`); };
  try {
    process.stdout.write('This checks the configured project with temporary test favourites. Use two confirmed test accounts.\n');
    if ((await ask('Type RUN to proceed: ')).trim() !== 'RUN') return;
    for (const [index, label] of ['A', 'B'].entries()) {
      const email = (await ask(`Account ${label} email: `)).trim();
      let password = await ask(`Account ${label} password (hidden): `, true);
      const result = await clients[index].auth.signInWithPassword({ email, password }); password = '';
      if (result.error || !result.data.session) throw new Error(`Account ${label} login failed. Check confirmation and credentials.`);
      ids.push(result.data.user.id);
    }
    check(ids[0] !== ids[1], 'two distinct authenticated accounts');
    for (const index of [0, 1]) {
      const own = await clients[index].from('favourites').insert({ user_id: ids[index], station_id: marker }).select('user_id,station_id');
      check(!own.error && own.data?.length === 1 && own.data[0].user_id === ids[index], `account ${index ? 'B' : 'A'} can save its own row`);
    }
    for (const actor of [0, 1]) {
      const victim = 1 - actor, client = clients[actor], label = actor ? 'B' : 'A';
      const list = await client.from('favourites').select('user_id,station_id'); // Intentionally no owner filter.
      check(!list.error && list.data?.every(row => row.user_id === ids[actor]), `${label}: unfiltered SELECT contains only own rows`);
      const read = await client.from('favourites').select('user_id').eq('user_id', ids[victim]);
      check(!read.error && read.data?.length === 0, `${label}: other account SELECT returns no rows`);
      const insert = await client.from('favourites').insert({ user_id: ids[victim], station_id: forged });
      check(insert.error?.code === '42501', `${label}: forged ownership INSERT denied by RLS`);
      const remove = await client.from('favourites').delete().eq('user_id', ids[victim]).eq('station_id', marker).select('user_id');
      check(!remove.error && remove.data?.length === 0, `${label}: other account DELETE changes no rows`);
      const survivor = await clients[victim].from('favourites').select('user_id').eq('user_id', ids[victim]).eq('station_id', marker);
      check(!survivor.error && survivor.data?.length === 1, `${label}: victim row still exists`);
      const duplicate = await client.from('favourites').insert({ user_id: ids[actor], station_id: marker });
      check(duplicate.error?.code === '23505', `${label}: duplicate own favourite rejected`);
      const update = await client.from('favourites').update({ station_id: forged }).eq('user_id', ids[actor]).eq('station_id', marker);
      check(update.error?.code === '42501', `${label}: UPDATE denied`);
    }
    const anon = await clients[2].from('favourites').select('user_id');
    check(anon.error?.code === '42501', 'anonymous SELECT denied');
    const anonInsert = await clients[2].from('favourites').insert({ user_id: ids[0], station_id: forged });
    check(anonInsert.error?.code === '42501', 'anonymous INSERT denied');
    const anonDelete = await clients[2].from('favourites').delete().eq('user_id', ids[0]).eq('station_id', marker);
    check(anonDelete.error?.code === '42501', 'anonymous DELETE denied');
    for (const index of [0, 1]) {
      const removed = await clients[index].from('favourites').delete().eq('user_id', ids[index]).eq('station_id', marker).select('user_id');
      check(!removed.error && removed.data?.length === 1, `${index ? 'B' : 'A'}: own DELETE succeeds`);
    }
  } finally {
    for (let index = 0; index < ids.length; index++) {
      // Only this run's random markers, using each owner's ordinary JWT.
      const cleanup = await clients[index].from('favourites').delete().eq('user_id', ids[index]).in('station_id', [marker, forged]);
      if (cleanup.error) process.stdout.write('Cleanup incomplete: reconnect, then remove rows starting ride-rls-check- from these test accounts in Saved.\n');
    }
    await Promise.allSettled(clients.map(async client => { await client.auth.signOut({ scope: 'local' }); await client.auth.dispose(); }));
    muted = false; rl.close();
  }
}
if (require.main === module) main().catch(error => {
  // Only curated errors from this script; never dump SDK responses or sessions.
  process.stderr.write(error instanceof Error && /^(Use |Run |Account |FAILED:)/.test(error.message)
    ? `${error.message}\n` : 'Verification could not finish. Check connection and dashboard configuration.\n');
  process.exitCode = 1;
});
