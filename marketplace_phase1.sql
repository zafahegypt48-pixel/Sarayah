-- ============================================================================
-- SARAYAH — MARKETPLACE PHASE 1 (database foundation)
-- ============================================================================
-- Turns the venues-only schema into a multi-category marketplace foundation.
-- SAFE TO RUN on the existing DB: every statement is idempotent (if-not-exists /
-- on-conflict) and additive — it does NOT drop or rename existing objects, so the
-- current app keeps working unchanged. Run it in the Supabase SQL Editor.
--
-- Design: a "venue" is just a listing in the 'venues' category. The existing
-- `venues` table becomes the general LISTINGS table (kept under its current name
-- to avoid breaking RLS/RPCs/grants/code). Category-specific fields live in the
-- new `attributes` jsonb. New marketplace tables (packages, images, reviews,
-- favorites, profiles) are added with the same RLS pattern as the rest of the app.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. REFERENCE TABLES: categories + governorates + cities  (public read / admin write)
-- ---------------------------------------------------------------------------
create table if not exists categories (
  id text primary key,                 -- slug, e.g. 'photography'
  name_en text not null,
  name_ar text not null,
  icon text,
  parent_id text references categories(id) on delete set null,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists governorates (
  id text primary key,                 -- slug, e.g. 'cairo'
  name_en text not null,
  name_ar text not null,
  sort_order integer default 0
);

create table if not exists cities (
  id text primary key,                 -- slug, e.g. 'new-cairo'
  governorate_id text references governorates(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  sort_order integer default 0
);
create index if not exists cities_governorate_idx on cities(governorate_id);

alter table categories   enable row level security;
alter table governorates enable row level security;
alter table cities       enable row level security;

drop policy if exists "categories_public_read"  on categories;
drop policy if exists "categories_admin_write"  on categories;
create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "governorates_public_read" on governorates;
drop policy if exists "governorates_admin_write" on governorates;
create policy "governorates_public_read" on governorates for select using (true);
create policy "governorates_admin_write" on governorates for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists "cities_public_read"  on cities;
drop policy if exists "cities_admin_write"  on cities;
create policy "cities_public_read" on cities for select using (true);
create policy "cities_admin_write" on cities for all to authenticated using (is_admin()) with check (is_admin());

grant select on categories, governorates, cities to anon, authenticated;

insert into categories (id, name_en, name_ar, icon, sort_order) values
  ('venues',          'Venues',            'قاعات وأماكن',   '🏛️', 1),
  ('photography',     'Photography',       'تصوير فوتوغرافي', '📷', 2),
  ('videography',     'Videography',       'تصوير فيديو',     '🎥', 3),
  ('makeup-hair',     'Makeup & Hair',     'مكياج وتسريحات',  '💄', 4),
  ('catering',        'Catering & Buffet', 'بوفيه وضيافة',    '🍽️', 5),
  ('entertainment',   'DJ & Zaffa',        'دي جيه وزفة',     '🥁', 6),
  ('wedding-dresses', 'Wedding Dresses',   'فساتين زفاف',     '👰', 7),
  ('flowers-decor',   'Flowers & Decor',   'زهور وديكور',     '💐', 8),
  ('cakes-sweets',    'Cakes & Sweets',    'كيك وحلويات',     '🎂', 9),
  ('invitations',     'Invitations',       'دعوات ومطبوعات',  '✉️', 10),
  ('wedding-cars',    'Wedding Cars',      'سيارات أفراح',    '🚗', 11),
  ('planners',        'Wedding Planners',  'منظمو حفلات',     '📋', 12)
on conflict (id) do nothing;

insert into governorates (id, name_en, name_ar, sort_order) values
  ('cairo',       'Cairo',       'القاهرة',      1),
  ('giza',        'Giza',        'الجيزة',       2),
  ('alexandria',  'Alexandria',  'الإسكندرية',   3),
  ('qalyubia',    'Qalyubia',    'القليوبية',    4),
  ('dakahlia',    'Dakahlia',    'الدقهلية',     5),
  ('red-sea',     'Red Sea',     'البحر الأحمر', 6),
  ('south-sinai', 'South Sinai', 'جنوب سيناء',   7),
  ('luxor',       'Luxor',       'الأقصر',       8),
  ('aswan',       'Aswan',       'أسوان',        9),
  ('port-said',   'Port Said',   'بورسعيد',      10)
on conflict (id) do nothing;

insert into cities (id, governorate_id, name_en, name_ar, sort_order) values
  ('new-cairo',      'cairo',       'New Cairo',      'القاهرة الجديدة',  1),
  ('nasr-city',      'cairo',       'Nasr City',      'مدينة نصر',        2),
  ('heliopolis',     'cairo',       'Heliopolis',     'مصر الجديدة',      3),
  ('maadi',          'cairo',       'Maadi',          'المعادي',          4),
  ('zamalek',        'cairo',       'Zamalek',        'الزمالك',          5),
  ('downtown-cairo', 'cairo',       'Downtown',       'وسط البلد',        6),
  ('6th-october',    'giza',        '6th of October', 'السادس من أكتوبر', 1),
  ('sheikh-zayed',   'giza',        'Sheikh Zayed',   'الشيخ زايد',       2),
  ('dokki',          'giza',        'Dokki',          'الدقي',            3),
  ('mohandessin',    'giza',        'Mohandessin',    'المهندسين',        4),
  ('haram',          'giza',        'Haram',          'الهرم',            5),
  ('smouha',         'alexandria',  'Smouha',         'سموحة',            1),
  ('montazah',       'alexandria',  'Montazah',       'المنتزه',          2),
  ('gleem',          'alexandria',  'Gleem',          'جليم',             3),
  ('hurghada',       'red-sea',     'Hurghada',       'الغردقة',          1),
  ('el-gouna',       'red-sea',     'El Gouna',       'الجونة',           2),
  ('sharm',          'south-sinai', 'Sharm El Sheikh','شرم الشيخ',        1),
  ('dahab',          'south-sinai', 'Dahab',          'دهب',              2),
  ('mansoura',       'dakahlia',    'Mansoura',       'المنصورة',         1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. EVOLVE `venues` INTO THE GENERAL LISTINGS TABLE  (additive columns)
-- ---------------------------------------------------------------------------
alter table venues
  add column if not exists category_id    text references categories(id) on delete set null,
  add column if not exists slug           text,
  add column if not exists price_min      numeric,
  add column if not exists price_max      numeric,
  add column if not exists attributes     jsonb not null default '{}',
  add column if not exists governorate_id text references governorates(id) on delete set null,
  add column if not exists city_id        text references cities(id) on delete set null;

-- Backfill existing rows into the Venues category + a price + a slug.
update venues set category_id = 'venues' where category_id is null;
update venues set price_min = "startingPrice" where price_min is null and "startingPrice" is not null;
update venues
  set slug = trim(both '-' from regexp_replace(lower(coalesce(name, 'listing')), '[^a-z0-9]+', '-', 'g'))
             || '-' || left(replace(id, 'v', ''), 6)
  where slug is null;
create unique index if not exists venues_slug_uidx on venues(slug);

-- Expose the new PUBLIC-SAFE columns through the column-level grants.
grant select (category_id, slug, price_min, price_max, attributes, governorate_id, city_id)
  on venues to anon, authenticated;

-- Filter indexes for the new facets (partial on publicly visible rows).
create index if not exists venues_category_idx      on venues(category_id)    where status in ('approved','verified');
create index if not exists venues_governorate_fk_idx on venues(governorate_id) where status in ('approved','verified');
create index if not exists venues_city_fk_idx        on venues(city_id)        where status in ('approved','verified');

-- ---------------------------------------------------------------------------
-- 3. PACKAGES  (vendor offerings; public read for approved listings, admin write)
-- ---------------------------------------------------------------------------
create table if not exists packages (
  id text primary key default ('pk' || replace(gen_random_uuid()::text, '-', '')),
  listing_id text references venues(id) on delete cascade,
  name_en text,
  name_ar text,
  price numeric,
  currency text default 'EGP',
  includes text[] default '{}',
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index if not exists packages_listing_idx on packages(listing_id);

alter table packages enable row level security;
drop policy if exists "packages_public_read" on packages;
drop policy if exists "packages_admin_write" on packages;
create policy "packages_public_read" on packages for select using (
  exists (select 1 from venues v where v.id = listing_id and v.status in ('approved','verified'))
);
create policy "packages_admin_write" on packages for all to authenticated using (is_admin()) with check (is_admin());
grant select on packages to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. LISTING IMAGES  (normalized gallery; public read for approved, admin write)
-- ---------------------------------------------------------------------------
create table if not exists listing_images (
  id text primary key default ('img' || replace(gen_random_uuid()::text, '-', '')),
  listing_id text references venues(id) on delete cascade,
  url text not null,
  alt text,
  is_cover boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);
create index if not exists listing_images_listing_idx on listing_images(listing_id);

alter table listing_images enable row level security;
drop policy if exists "listing_images_public_read" on listing_images;
drop policy if exists "listing_images_admin_write" on listing_images;
create policy "listing_images_public_read" on listing_images for select using (
  exists (select 1 from venues v where v.id = listing_id and v.status in ('approved','verified'))
);
create policy "listing_images_admin_write" on listing_images for all to authenticated using (is_admin()) with check (is_admin());
grant select on listing_images to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. REVIEWS  (public submit as PENDING, public read APPROVED, admin moderates)
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id text primary key default ('rv' || replace(gen_random_uuid()::text, '-', '')),
  listing_id text references venues(id) on delete cascade,
  user_id uuid,                                   -- nullable: guest reviews allowed
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  status text not null default 'pending',         -- pending|approved|rejected
  created_at timestamptz default now()
);
create index if not exists reviews_listing_approved_idx on reviews(listing_id) where status = 'approved';

alter table reviews enable row level security;
drop policy if exists "reviews_public_read"   on reviews;
drop policy if exists "reviews_public_insert" on reviews;
drop policy if exists "reviews_admin_read"    on reviews;
drop policy if exists "reviews_admin_update"  on reviews;
drop policy if exists "reviews_admin_delete"  on reviews;
create policy "reviews_public_read"   on reviews for select using (status = 'approved');
create policy "reviews_public_insert" on reviews for insert with check (status = 'pending'); -- cannot self-approve
create policy "reviews_admin_read"    on reviews for select to authenticated using (is_admin());
create policy "reviews_admin_update"  on reviews for update to authenticated using (is_admin()) with check (is_admin());
create policy "reviews_admin_delete"  on reviews for delete to authenticated using (is_admin());
grant select, insert on reviews to anon, authenticated;

-- Roll the approved-review average + count back onto the listing (rating/reviews).
create or replace function public.recalc_listing_rating(p_listing text)
returns void language sql security definer set search_path = public as $$
  update venues v set
    rating  = coalesce((select round(avg(rating)::numeric, 1) from reviews r where r.listing_id = p_listing and r.status = 'approved'), 0),
    reviews = (select count(*) from reviews r where r.listing_id = p_listing and r.status = 'approved')
  where v.id = p_listing;
$$;
create or replace function public.reviews_rollup_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.recalc_listing_rating(coalesce(new.listing_id, old.listing_id));
  return coalesce(new, old);
end; $$;
drop trigger if exists reviews_rollup on reviews;
create trigger reviews_rollup after insert or update or delete on reviews
  for each row execute function public.reviews_rollup_trg();

-- ---------------------------------------------------------------------------
-- 6. FAVORITES  (a signed-in user's wishlist — strictly own-rows)
-- ---------------------------------------------------------------------------
create table if not exists favorites (
  id text primary key default ('fv' || replace(gen_random_uuid()::text, '-', '')),
  user_id uuid not null,
  listing_id text references venues(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, listing_id)
);
create index if not exists favorites_user_idx on favorites(user_id);

alter table favorites enable row level security;
drop policy if exists "favorites_own_select" on favorites;
drop policy if exists "favorites_own_insert" on favorites;
drop policy if exists "favorites_own_delete" on favorites;
create policy "favorites_own_select" on favorites for select to authenticated using (user_id = auth.uid());
create policy "favorites_own_insert" on favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorites_own_delete" on favorites for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on favorites to authenticated;

-- ---------------------------------------------------------------------------
-- 7. PROFILES  (role + contact on top of Supabase auth; own-rows + admin read)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'couple',            -- couple|vendor (admin gated via admins table)
  phone text,
  locale text default 'en',
  created_at timestamptz default now()
);

alter table profiles enable row level security;
drop policy if exists "profiles_own_select"  on profiles;
drop policy if exists "profiles_own_insert"  on profiles;
drop policy if exists "profiles_own_update"  on profiles;
drop policy if exists "profiles_admin_read"  on profiles;
create policy "profiles_own_select" on profiles for select to authenticated using (user_id = auth.uid());
create policy "profiles_own_insert" on profiles for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_own_update" on profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_admin_read" on profiles for select to authenticated using (is_admin());
grant select, insert, update on profiles to authenticated;

-- Auto-create a profile row when a user signs up (reads signup metadata).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'couple'))
  on conflict (user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- END MARKETPLACE PHASE 1. Verify:  select id,name_en from categories order by sort_order;
-- ============================================================================
