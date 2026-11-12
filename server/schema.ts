// Cluster v1 (spec 4.2). No table keeps an address, a browser, or the content of one envelope.
// Kept as a string, not a .sql file, so the Vercel bundle carries it without a file read.
export const SCHEMA = `
create table if not exists counts (zone text not null, kind text not null, week text not null, n int not null default 0, primary key (zone, kind, week));
create table if not exists envelope_totals (week text primary key, n int not null default 0);
create table if not exists seen_nonces (week text not null, nonce text not null, primary key (week, nonce));
create table if not exists network_caps (week text not null, grp text not null, n int not null default 0, primary key (week, grp));
create table if not exists week_keys (week text primary key, key bytea not null);
create table if not exists held (id serial primary key, zone text not null, kind text not null, week text not null, n int not null, status text not null default 'pending', first_reviewer text, first_choice text, decided_at timestamptz);
create table if not exists published (week text primary key, file jsonb not null);
create table if not exists suspensions (id serial primary key, zone text not null, reason text not null, started date not null, ended date);
create table if not exists harm_reports (week text not null, kind text not null, n int not null default 0, primary key (week, kind));
create table if not exists settings (name text primary key, value text not null);
create table if not exists admin_log (id serial primary key, week text not null, day date not null, reviewer text not null, action text not null, detail text not null);
create table if not exists login_failures (name text primary key, n int not null default 0, until timestamptz);
`
