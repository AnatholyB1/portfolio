-- MCP admin : tokens d'accès et journal d'audit. Accès service_role uniquement.
create table if not exists public.sv_mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sv_admins (user_id) on delete cascade,
  token_hash text not null unique,
  label text not null check (char_length(label) between 1 and 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_used_at timestamptz null
);
alter table public.sv_mcp_tokens enable row level security;
revoke all on public.sv_mcp_tokens from anon, authenticated;

create table if not exists public.sv_mcp_audit (
  id bigint generated always as identity primary key,
  token_id uuid null references public.sv_mcp_tokens (id) on delete set null,
  user_id uuid not null,
  tool text not null,
  destructive boolean not null,
  outcome text not null check (outcome in ('ok', 'error', 'needs_confirmation')),
  at timestamptz not null default now()
);
alter table public.sv_mcp_audit enable row level security;
revoke all on public.sv_mcp_audit from anon, authenticated;
