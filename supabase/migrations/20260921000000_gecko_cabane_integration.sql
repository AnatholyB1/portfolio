-- supabase/migrations/20260921000000_gecko_cabane_integration.sql
--
-- Integrates the Gecko Cabane restaurant site into the shared portfolio
-- Supabase project. All gecko-cabane tables are prefixed `gecko_` to stay
-- isolated from this project's own tables (prospects, demo CRM) in the
-- `public` schema.
--
-- Hardening applied vs. the original gecko-cabane schema:
--   1. A dedicated `gecko_admins` role table + `gecko_is_admin()` helper
--      replaces every `auth.role() = 'authenticated'` policy. Being merely
--      logged in (any Supabase Auth user in this shared project) no longer
--      grants write access to gecko-cabane's admin data — only rows present
--      in gecko_admins do. gecko_admins has no anon/authenticated write
--      policy: rows are inserted exclusively via the service_role key.
--   2. The original "Allow public to view by phone" policy on `reservations`
--      was `FOR SELECT USING (true)` — i.e. unrestricted, exposing every
--      customer's name/email/phone to anyone holding the public anon key.
--      It is NOT carried over. Phone-based lookup now happens through a
--      server route using the service_role key (mirrors the existing
--      phone_verifications pattern).

-- ============================================================
-- Admin role table + helper
-- ============================================================

create table if not exists public.gecko_admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table public.gecko_admins enable row level security;

-- Users may check their own admin status; no anon/authenticated insert,
-- update or delete policy exists on purpose — service_role only.
create policy "gecko_admins self read" on public.gecko_admins
  for select using (auth.uid() = id);

create or replace function public.gecko_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.gecko_admins where id = auth.uid());
$$;

revoke all on function public.gecko_is_admin() from public;
grant execute on function public.gecko_is_admin() to anon, authenticated;

-- ============================================================
-- Shared trigger functions (gecko-prefixed to avoid any collision
-- with functions this project may already define)
-- ============================================================

create or replace function public.gecko_update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.gecko_update_reservation_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- Opening hours
-- ============================================================

create table if not exists public.gecko_opening_hours (
  id SERIAL PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_name VARCHAR(20) NOT NULL,
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists public.gecko_special_hours (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  title VARCHAR(100),
  is_open BOOLEAN DEFAULT true,
  open_time TIME,
  close_time TIME,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

alter table public.gecko_opening_hours enable row level security;
alter table public.gecko_special_hours enable row level security;

create policy "Public read gecko_opening_hours" on public.gecko_opening_hours
  for select using (true);
create policy "Admin manage gecko_opening_hours" on public.gecko_opening_hours
  for all using (public.gecko_is_admin());

create policy "Public read gecko_special_hours" on public.gecko_special_hours
  for select using (true);
create policy "Admin manage gecko_special_hours" on public.gecko_special_hours
  for all using (public.gecko_is_admin());

-- ============================================================
-- Announcement
-- ============================================================

create table if not exists public.gecko_announcement (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  bg_color VARCHAR(50) DEFAULT 'amber',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

alter table public.gecko_announcement enable row level security;

create policy "Public read gecko_announcement" on public.gecko_announcement
  for select using (true);
create policy "Admin manage gecko_announcement" on public.gecko_announcement
  for all using (public.gecko_is_admin());

-- ============================================================
-- Menu
-- ============================================================

create table if not exists public.gecko_menu_pages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists public.gecko_menu_categories (
  id SERIAL PRIMARY KEY,
  menu_page_id INTEGER NOT NULL REFERENCES public.gecko_menu_pages(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists public.gecko_menu_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES public.gecko_menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  price_label VARCHAR(50),
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_vegetarian BOOLEAN DEFAULT false,
  is_spicy BOOLEAN DEFAULT false,
  allergens TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create index if not exists idx_gecko_menu_categories_page on public.gecko_menu_categories(menu_page_id);
create index if not exists idx_gecko_menu_items_category on public.gecko_menu_items(category_id);
create index if not exists idx_gecko_menu_pages_order on public.gecko_menu_pages(display_order);
create index if not exists idx_gecko_menu_categories_order on public.gecko_menu_categories(display_order);
create index if not exists idx_gecko_menu_items_order on public.gecko_menu_items(display_order);

alter table public.gecko_menu_pages enable row level security;
alter table public.gecko_menu_categories enable row level security;
alter table public.gecko_menu_items enable row level security;

create policy "Public read gecko_menu_pages" on public.gecko_menu_pages
  for select using (true);
create policy "Admin manage gecko_menu_pages" on public.gecko_menu_pages
  for all using (public.gecko_is_admin());

create policy "Public read gecko_menu_categories" on public.gecko_menu_categories
  for select using (true);
create policy "Admin manage gecko_menu_categories" on public.gecko_menu_categories
  for all using (public.gecko_is_admin());

create policy "Public read gecko_menu_items" on public.gecko_menu_items
  for select using (true);
create policy "Admin manage gecko_menu_items" on public.gecko_menu_items
  for all using (public.gecko_is_admin());

-- Storage bucket for menu images (buckets do not migrate across projects,
-- this is a fresh bucket — files are copied separately, see MIGRATION.md)
insert into storage.buckets (id, name, public)
values ('gecko-menu-images', 'gecko-menu-images', true)
on conflict (id) do nothing;

create policy "Public can view gecko menu images" on storage.objects
  for select using (bucket_id = 'gecko-menu-images');

create policy "Admins can upload gecko menu images" on storage.objects
  for insert with check (bucket_id = 'gecko-menu-images' and public.gecko_is_admin());

create policy "Admins can delete gecko menu images" on storage.objects
  for delete using (bucket_id = 'gecko-menu-images' and public.gecko_is_admin());

-- ============================================================
-- Reservations
-- ============================================================

create table if not exists public.gecko_reservations (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(30) NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 50),
  occasion VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

create index if not exists idx_gecko_reservations_date on public.gecko_reservations(reservation_date);
create index if not exists idx_gecko_reservations_status on public.gecko_reservations(status);
create index if not exists idx_gecko_reservations_created on public.gecko_reservations(created_at DESC);
create index if not exists idx_gecko_reservations_phone on public.gecko_reservations(customer_phone);

alter table public.gecko_reservations enable row level security;

-- No anon/authenticated INSERT policy on purpose (unlike the original
-- gecko-cabane schema, which had `FOR INSERT WITH CHECK (true)`). Two
-- reasons:
--   1. Postgres enforces SELECT-policy visibility on the RETURNING clause
--      of INSERT ... RETURNING (what supabase-js sends for `.insert().select()`).
--      With no public SELECT policy on this table, an anon INSERT with
--      RETURNING fails RLS even though the WITH CHECK itself is `true`.
--   2. The public booking form's only real gate is the Twilio-verified
--      phone token checked in the Route Handler — RLS can't express that
--      check, so the insert now goes through the service_role client
--      (POST /api/reservations), the same trust boundary already used for
--      consuming gecko_phone_verifications tokens. This also closes a
--      pre-existing gap: an anon key holder could previously call the
--      PostgREST endpoint directly and insert a reservation without ever
--      passing phone verification.
-- Admin reads/writes only, no public SELECT policy either (see file header).
create policy "Admin manage gecko_reservations" on public.gecko_reservations
  for all using (public.gecko_is_admin());

revoke insert, update, delete, select on public.gecko_reservations from anon;

drop trigger if exists gecko_reservations_updated_at on public.gecko_reservations;
create trigger gecko_reservations_updated_at
  before update on public.gecko_reservations
  for each row execute function public.gecko_update_reservation_timestamp();

-- ============================================================
-- Floor plan / tables
-- ============================================================

create table if not exists public.gecko_tables (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  seats INTEGER NOT NULL DEFAULT 2 CHECK (seats > 0 AND seats <= 30),
  position_x DOUBLE PRECISION NOT NULL DEFAULT 50 CHECK (position_x >= 0 AND position_x <= 100),
  position_y DOUBLE PRECISION NOT NULL DEFAULT 50 CHECK (position_y >= 0 AND position_y <= 100),
  width DOUBLE PRECISION NOT NULL DEFAULT 9,
  height DOUBLE PRECISION NOT NULL DEFAULT 11,
  shape VARCHAR(20) NOT NULL DEFAULT 'square' CHECK (shape IN ('square', 'round', 'rectangle')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists public.gecko_table_configurations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  min_capacity INTEGER NOT NULL DEFAULT 1 CHECK (min_capacity > 0),
  max_capacity INTEGER NOT NULL DEFAULT 2 CHECK (max_capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT gecko_valid_capacity CHECK (max_capacity >= min_capacity)
);

create table if not exists public.gecko_table_configuration_tables (
  table_configuration_id INTEGER NOT NULL REFERENCES public.gecko_table_configurations(id) ON DELETE CASCADE,
  table_id               INTEGER NOT NULL REFERENCES public.gecko_tables(id) ON DELETE CASCADE,
  PRIMARY KEY (table_configuration_id, table_id)
);

create table if not exists public.gecko_table_assignments (
  id                       SERIAL PRIMARY KEY,
  reservation_id           INTEGER NOT NULL UNIQUE REFERENCES public.gecko_reservations(id) ON DELETE CASCADE,
  table_configuration_id   INTEGER NOT NULL REFERENCES public.gecko_table_configurations(id),
  blocked_until            TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create table if not exists public.gecko_restaurant_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

insert into public.gecko_restaurant_settings (key, value, description) values
  ('table_block_duration_minutes', '120',
   'Durée de blocage d''une table après le début d''une réservation (minutes)'),
  ('max_covers', '40',
   'Nombre maximum de couverts par service')
on conflict (key) do nothing;

create index if not exists idx_gecko_table_assignments_blocked on public.gecko_table_assignments(blocked_until);
create index if not exists idx_gecko_table_assignments_config on public.gecko_table_assignments(table_configuration_id);
create index if not exists idx_gecko_table_config_tables_table on public.gecko_table_configuration_tables(table_id);
create index if not exists idx_gecko_tables_active on public.gecko_tables(is_active);

alter table public.gecko_tables enable row level security;
alter table public.gecko_table_configurations enable row level security;
alter table public.gecko_table_configuration_tables enable row level security;
alter table public.gecko_table_assignments enable row level security;
alter table public.gecko_restaurant_settings enable row level security;

create policy "Public read gecko_tables" on public.gecko_tables for select using (true);
create policy "Admin manage gecko_tables" on public.gecko_tables for all using (public.gecko_is_admin());

create policy "Public read gecko_table_configurations" on public.gecko_table_configurations for select using (true);
create policy "Admin manage gecko_table_configurations" on public.gecko_table_configurations for all using (public.gecko_is_admin());

create policy "Public read gecko_table_configuration_tables" on public.gecko_table_configuration_tables for select using (true);
create policy "Admin manage gecko_table_configuration_tables" on public.gecko_table_configuration_tables for all using (public.gecko_is_admin());

create policy "Public read gecko_table_assignments" on public.gecko_table_assignments for select using (true);
create policy "Admin manage gecko_table_assignments" on public.gecko_table_assignments for all using (public.gecko_is_admin());

create policy "Public read gecko_restaurant_settings" on public.gecko_restaurant_settings for select using (true);
create policy "Admin manage gecko_restaurant_settings" on public.gecko_restaurant_settings for all using (public.gecko_is_admin());

create trigger gecko_tables_updated_at
  before update on public.gecko_tables
  for each row execute function public.gecko_update_updated_at_column();

create trigger gecko_table_configurations_updated_at
  before update on public.gecko_table_configurations
  for each row execute function public.gecko_update_updated_at_column();

create trigger gecko_restaurant_settings_updated_at
  before update on public.gecko_restaurant_settings
  for each row execute function public.gecko_update_updated_at_column();

-- ============================================================
-- Phone verifications — service_role only, no public policies
-- (mirrors the original: RLS enabled, zero grants to anon/authenticated)
-- ============================================================

create table if not exists public.gecko_phone_verifications (
  id               SERIAL PRIMARY KEY,
  phone            VARCHAR(30)              NOT NULL,
  verified_token   TEXT                     NOT NULL UNIQUE,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

create index if not exists idx_gecko_pv_token on public.gecko_phone_verifications(verified_token);
create index if not exists idx_gecko_pv_expires on public.gecko_phone_verifications(token_expires_at);

alter table public.gecko_phone_verifications enable row level security;
