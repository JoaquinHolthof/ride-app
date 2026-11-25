const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261125162038_create_user_favourites.sql'), 'utf8');
const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002';

test('actual migration enforces ownership, unique rows, grants and RLS in isolated Postgres', async t => {
  const db = new PGlite();
  try {
    // Fixtures only: hosted Supabase supplies auth.users, auth.uid and JWT claims.
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;`);
    await db.query('insert into auth.users values ($1), ($2)', [A, B]);
    await db.exec(migration);
    const asUser = async id => {
      await db.exec('reset role; set role authenticated;');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    };
    await t.test('owner SELECT INSERT DELETE work; same station can belong to both accounts', async () => {
      for (const id of [A, B]) {
        await asUser(id);
        await db.query('insert into public.favourites values ($1, $2)', [id, 'same-station']);
        const rows = (await db.query('select * from public.favourites')).rows;
        assert.deepEqual(rows, [{ user_id: id, station_id: 'same-station' }]);
      }
    });
    await t.test('both accounts cannot read, forge or delete the other owner’s rows', async () => {
      for (const [actor, victim] of [[A, B], [B, A]]) {
        await asUser(actor);
        assert.equal((await db.query('select * from public.favourites where user_id = $1', [victim])).rows.length, 0);
        await assert.rejects(db.query('insert into public.favourites values ($1, $2)', [victim, 'forged']), error => error.code === '42501');
        assert.equal((await db.query('delete from public.favourites where user_id = $1 returning *', [victim])).rows.length, 0);
        await asUser(victim);
        assert.equal((await db.query('select * from public.favourites')).rows.length, 1);
      }
    });
    await t.test('duplicates, blank IDs and missing owners are rejected', async () => {
      await asUser(A);
      await assert.rejects(db.query('insert into public.favourites values ($1, $2)', [A, 'same-station']), e => e.code === '23505');
      for (const station of ['', ' padded ', 'x'.repeat(257)]) {
        await assert.rejects(db.query('insert into public.favourites values ($1, $2)', [A, station]), e => e.code === '23514');
      }
      await assert.rejects(db.query("insert into public.favourites values (null, 'no-owner')"), e => ['42501', '23502'].includes(e.code));
    });
    await t.test('UPDATE and TRUNCATE are denied; unauthenticated role has no access', async () => {
      await asUser(A);
      await assert.rejects(db.query("update public.favourites set station_id = 'changed'"), e => e.code === '42501');
      await assert.rejects(db.query('truncate public.favourites'), e => e.code === '42501');
      await asUser('');
      assert.equal((await db.query('select * from public.favourites')).rows.length, 0);
      await db.exec('reset role; set role anon;');
      await assert.rejects(db.query('select * from public.favourites'), e => e.code === '42501');
      await assert.rejects(db.query('delete from public.favourites'), e => e.code === '42501');
      await assert.rejects(db.query('insert into public.favourites values ($1, $2)', [A, 'anon']), e => e.code === '42501');
    });
    await t.test('RLS enabled/forced, exactly three owner policies, own delete and account cascade', async () => {
      await db.exec('reset role;');
      const flags = (await db.query("select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.favourites'::regclass")).rows[0];
      assert.deepEqual(flags, { relrowsecurity: true, relforcerowsecurity: true });
      assert.equal((await db.query("select * from pg_policies where schemaname = 'public' and tablename = 'favourites'")).rows.length, 3);
      await asUser(A);
      assert.equal((await db.query('delete from public.favourites where user_id=$1 returning *', [A])).rows.length, 1);
      await db.exec('reset role;');
      await db.query('delete from auth.users where id=$1', [B]);
      assert.equal((await db.query('select * from public.favourites')).rows.length, 0);
    });
  } finally { await db.close(); }
});
