-- MCP admin : tokens d'accès et journal d'audit. Accès service_role uniquement.
create table if not exists public.sv_mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.sv_admins (user_id) on delete cascade,
  token_hash text not null unique,
  label text not null check (char_length(label) between 1 and 80),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  last_used_at timestamptz null,
  check (expires_at > created_at)
);
alter table public.sv_mcp_tokens enable row level security;
revoke all on public.sv_mcp_tokens from anon, authenticated;
create index if not exists sv_mcp_tokens_user_id_idx on public.sv_mcp_tokens (user_id);

create table if not exists public.sv_mcp_audit (
  id bigint generated always as identity primary key,
  token_id uuid null references public.sv_mcp_tokens (id) on delete set null,
  user_id uuid not null,
  tool text not null,
  destructive boolean not null,
  outcome text not null check (outcome in ('attempt', 'ok', 'error', 'needs_confirmation')),
  -- sha256 hex du JSON canonique de l'entrée validée, sans `confirm` ; jamais les arguments bruts.
  args_digest text null,
  at timestamptz not null default now()
);
alter table public.sv_mcp_audit enable row level security;
revoke all on public.sv_mcp_audit from anon, authenticated;
create index if not exists sv_mcp_audit_token_id_idx on public.sv_mcp_audit (token_id);
create index if not exists sv_mcp_audit_tool_at_idx on public.sv_mcp_audit (tool, at);

-- service_role : ne pas dépendre des default privileges. Audit en ajout seul.
grant select, insert, update on public.sv_mcp_tokens to service_role;
grant select, insert on public.sv_mcp_audit to service_role;
