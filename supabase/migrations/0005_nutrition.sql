-- Stage 3: nutrition.
-- Food library, the coach's nutrition plan per client (day types with targets,
-- meal plans, hand portions), the client's food diary, and eating-out requests.
-- Sodium and water targets are set by the coach only.

-- ---------- foods ----------
-- Shared foods (owner_id is null) are added by the coach or come with the app.
-- A client's own foods (owner_id = client) are seen only by them and the coach.
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  countries text[] not null default '{}',    -- empty = everywhere; otherwise e.g. {UK} or {NZ}
  kcal numeric(6,1) not null,               -- all values per 100 g (or 100 ml)
  protein_g numeric(5,1) not null default 0,
  carbs_g numeric(5,1) not null default 0,
  fat_g numeric(5,1) not null default 0,
  fibre_g numeric(5,1),
  sodium_mg numeric(7,1),
  serving_g numeric(6,1),                    -- a typical serving, if known
  serving_name text,                         -- e.g. "1 medium egg"
  barcode text,
  source text not null default 'coach' check (source in ('generic', 'coach', 'client', 'off')),
  owner_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index foods_name on public.foods (lower(name));
create index foods_owner on public.foods (owner_id);
create unique index foods_shared_barcode on public.foods (barcode) where owner_id is null and barcode is not null;

alter table public.foods enable row level security;
create policy "foods: shared, own or coach" on public.foods for select
  using (owner_id is null or owner_id = auth.uid() or public.is_coach());
create policy "foods: client adds own, coach adds any" on public.foods for insert
  with check (owner_id = auth.uid() or public.is_coach());
create policy "foods: owner or coach updates" on public.foods for update using (owner_id = auth.uid() or public.is_coach());
create policy "foods: owner or coach deletes" on public.foods for delete using (owner_id = auth.uid() or public.is_coach());

-- ---------- nutrition plans (coach writes, client reads when live) ----------
create table public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  style text not null default 'macros' check (style in ('macros', 'plan', 'portions')),
  notes text,
  is_live boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index nutrition_plans_client on public.nutrition_plans (client_id, created_at desc);
create trigger nutrition_plans_touch before update on public.nutrition_plans for each row execute function public.touch_updated_at();

-- A day type: e.g. Training day, Rest day, High carb. Each has its own targets.
create table public.day_types (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.nutrition_plans (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  position int not null default 0,
  weekdays int[] not null default '{}',      -- 1 = Monday … 7 = Sunday; used as the default for that day
  kcal int,
  protein_g int,
  carbs_g int,
  fat_g int,
  fibre_g int,
  sodium_mg int,                              -- coach-set only
  water_ml int,                               -- coach-set only
  palms numeric(3,1),                         -- hand portions per day (protein, veg, carbs, fats)
  fists numeric(3,1),
  cupped numeric(3,1),
  thumbs numeric(3,1),
  notes text
);
create index day_types_plan on public.day_types (plan_id, position);

create table public.plan_meals (
  id uuid primary key default gen_random_uuid(),
  day_type_id uuid not null references public.day_types (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  position int not null default 0,
  notes text
);
create index plan_meals_day on public.plan_meals (day_type_id, position);

create table public.plan_meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.plan_meals (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  food_id uuid not null references public.foods (id),
  grams numeric(6,1) not null check (grams > 0 and grams <= 5000),
  position int not null default 0
);
create index plan_meal_items_meal on public.plan_meal_items (meal_id, position);

alter table public.nutrition_plans enable row level security;
create policy "nutrition plans: client reads own live, coach reads all" on public.nutrition_plans for select
  using (public.is_coach() or (client_id = auth.uid() and is_live));
create policy "nutrition plans: coach inserts" on public.nutrition_plans for insert with check (public.is_coach());
create policy "nutrition plans: coach updates" on public.nutrition_plans for update using (public.is_coach());
create policy "nutrition plans: coach deletes" on public.nutrition_plans for delete using (public.is_coach());

alter table public.day_types enable row level security;
create policy "day types: client reads own live, coach reads all" on public.day_types for select
  using (public.is_coach() or (client_id = auth.uid() and exists (select 1 from public.nutrition_plans p where p.id = plan_id and p.is_live)));
create policy "day types: coach inserts" on public.day_types for insert with check (public.is_coach());
create policy "day types: coach updates" on public.day_types for update using (public.is_coach());
create policy "day types: coach deletes" on public.day_types for delete using (public.is_coach());

alter table public.plan_meals enable row level security;
create policy "plan meals: client reads own live, coach reads all" on public.plan_meals for select
  using (public.is_coach() or (client_id = auth.uid() and exists (
    select 1 from public.day_types d join public.nutrition_plans p on p.id = d.plan_id where d.id = day_type_id and p.is_live)));
create policy "plan meals: coach inserts" on public.plan_meals for insert with check (public.is_coach());
create policy "plan meals: coach updates" on public.plan_meals for update using (public.is_coach());
create policy "plan meals: coach deletes" on public.plan_meals for delete using (public.is_coach());

alter table public.plan_meal_items enable row level security;
create policy "plan meal items: client reads own live, coach reads all" on public.plan_meal_items for select
  using (public.is_coach() or (client_id = auth.uid() and exists (
    select 1 from public.plan_meals m join public.day_types d on d.id = m.day_type_id join public.nutrition_plans p on p.id = d.plan_id
    where m.id = meal_id and p.is_live)));
create policy "plan meal items: coach inserts" on public.plan_meal_items for insert with check (public.is_coach());
create policy "plan meal items: coach updates" on public.plan_meal_items for update using (public.is_coach());
create policy "plan meal items: coach deletes" on public.plan_meal_items for delete using (public.is_coach());

-- ---------- food diary (client writes, coach reads) ----------
-- Each entry keeps its own copy of the numbers, so editing a food later never changes the past.
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  meal text not null,                         -- Breakfast, Lunch, Dinner, Snacks, or a plan meal's name
  food_id uuid references public.foods (id) on delete set null,
  name text not null,
  grams numeric(6,1) not null check (grams > 0 and grams <= 5000),
  kcal numeric(7,1) not null,
  protein_g numeric(6,1) not null default 0,
  carbs_g numeric(6,1) not null default 0,
  fat_g numeric(6,1) not null default 0,
  fibre_g numeric(6,1),
  sodium_mg numeric(8,1),
  eating_out boolean not null default false,
  created_at timestamptz not null default now()
);
create index food_logs_client_date on public.food_logs (client_id, log_date);

-- One row per client per day: which day type, water, hand portions ticked off.
create table public.nutrition_days (
  client_id uuid not null references public.profiles (id) on delete cascade,
  log_date date not null,
  day_type_id uuid references public.day_types (id) on delete set null,
  water_ml int not null default 0 check (water_ml between 0 and 20000),
  portions jsonb not null default '{}'::jsonb, -- {"palms":2,"fists":3,...}
  note text,
  updated_at timestamptz not null default now(),
  primary key (client_id, log_date)
);
create trigger nutrition_days_touch before update on public.nutrition_days for each row execute function public.touch_updated_at();

alter table public.food_logs enable row level security;
create policy "food logs: read own or coach" on public.food_logs for select using (client_id = auth.uid() or public.is_coach());
create policy "food logs: client inserts own" on public.food_logs for insert with check (client_id = auth.uid());
create policy "food logs: client updates own" on public.food_logs for update using (client_id = auth.uid());
create policy "food logs: client deletes own" on public.food_logs for delete using (client_id = auth.uid());

alter table public.nutrition_days enable row level security;
create policy "nutrition days: read own or coach" on public.nutrition_days for select using (client_id = auth.uid() or public.is_coach());
create policy "nutrition days: client inserts own" on public.nutrition_days for insert with check (client_id = auth.uid());
create policy "nutrition days: client updates own" on public.nutrition_days for update using (client_id = auth.uid());

-- ---------- eating out: a menu photo sent to the coach ----------
create table public.eating_out (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  photo_path text,
  note text,
  remaining jsonb not null default '{}'::jsonb,  -- what was left of the day's targets when sent
  coach_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index eating_out_client on public.eating_out (client_id, created_at desc);

alter table public.eating_out enable row level security;
create policy "eating out: read own or coach" on public.eating_out for select using (client_id = auth.uid() or public.is_coach());
create policy "eating out: client inserts own" on public.eating_out for insert with check (client_id = auth.uid());
create policy "eating out: coach replies" on public.eating_out for update using (public.is_coach());
create policy "eating out: client deletes own" on public.eating_out for delete using (client_id = auth.uid());

grant select, insert, update, delete on public.foods, public.nutrition_plans, public.day_types, public.plan_meals, public.plan_meal_items,
  public.food_logs, public.nutrition_days, public.eating_out to authenticated;

-- Menu photos live at menu-photos/<client id>/<file>. Private.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-photos', 'menu-photos', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
on conflict (id) do nothing;

create policy "menu photos: client uploads own" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "menu photos: client or coach reads" on storage.objects for select to authenticated
  using (bucket_id = 'menu-photos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach()));
create policy "menu photos: client deletes own" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- starter foods ----------
-- Typical values per 100 g, rounded, from standard food tables (UK CoFID style).
-- Branded and supermarket foods come from Open Food Facts when a client searches.
insert into public.foods (name, kcal, protein_g, carbs_g, fat_g, fibre_g, sodium_mg, serving_g, serving_name) values
 -- protein
 ('Chicken breast, raw, skinless', 106, 24.0, 0, 1.1, 0, 60, 150, '1 breast'),
 ('Chicken breast, grilled', 148, 32.0, 0, 2.2, 0, 70, 120, '1 breast'),
 ('Chicken thigh, raw, skinless', 126, 19.5, 0, 5.4, 0, 85, 90, '1 thigh'),
 ('Turkey mince, 5% fat, raw', 125, 20.5, 0, 4.8, 0, 70, null, null),
 ('Beef mince, 5% fat, raw', 124, 21.0, 0, 4.5, 0, 70, null, null),
 ('Beef mince, 10% fat, raw', 174, 20.0, 0, 10.5, 0, 70, null, null),
 ('Beef steak, sirloin, raw', 160, 22.5, 0, 7.5, 0, 55, 200, '1 steak'),
 ('Pork loin steak, raw', 140, 22.0, 0, 5.5, 0, 60, 150, '1 steak'),
 ('Lamb mince, raw', 230, 19.0, 0, 17.0, 0, 70, null, null),
 ('Salmon fillet, raw', 210, 20.5, 0, 14.0, 0, 50, 120, '1 fillet'),
 ('Cod fillet, raw', 80, 18.0, 0, 0.7, 0, 60, 140, '1 fillet'),
 ('White fish (hoki/basa), raw', 85, 17.5, 0, 1.5, 0, 70, 140, '1 fillet'),
 ('Prawns, cooked', 70, 15.5, 0, 0.9, 0, 400, null, null),
 ('Tuna in spring water, drained', 110, 25.0, 0, 0.8, 0, 320, 110, '1 small tin, drained'),
 ('Egg, whole', 140, 12.6, 0.2, 9.6, 0, 140, 58, '1 medium egg'),
 ('Egg whites, liquid', 48, 10.5, 0.7, 0.2, 0, 165, null, null),
 ('Greek yoghurt, 0% fat', 57, 10.3, 4.0, 0.2, 0, 40, 170, '1 pot'),
 ('Greek yoghurt, full fat', 130, 5.7, 4.5, 10.0, 0, 40, null, null),
 ('Skyr, plain', 63, 11.0, 4.0, 0.2, 0, 45, 150, '1 pot'),
 ('Cottage cheese, low fat', 80, 12.5, 3.5, 1.5, 0, 330, null, null),
 ('Whey protein powder', 390, 78.0, 7.0, 6.0, 0, 250, 30, '1 scoop'),
 ('Tofu, firm', 120, 13.0, 1.5, 7.0, 1.0, 10, null, null),
 ('Cheddar cheese', 410, 25.0, 0.1, 34.5, 0, 650, 30, '1 slice'),
 ('Mozzarella, light', 165, 20.0, 1.0, 9.0, 0, 400, 30, null),
 ('Halloumi', 320, 21.5, 2.0, 25.0, 0, 1100, 40, null),
 ('Ham, sliced', 105, 18.0, 1.5, 3.0, 0, 1000, 15, '1 slice'),
 ('Bacon medallions, raw', 110, 20.0, 0.5, 3.0, 0, 1200, 15, '1 medallion'),
 -- carbs
 ('White rice, cooked', 130, 2.7, 28.5, 0.3, 0.4, 1, null, null),
 ('White rice, dry', 355, 7.0, 79.0, 0.6, 1.0, 5, null, null),
 ('Basmati rice, cooked', 140, 3.0, 31.0, 0.4, 0.5, 1, null, null),
 ('Brown rice, cooked', 123, 2.7, 25.5, 1.0, 1.6, 2, null, null),
 ('Microwave rice pouch, plain', 160, 3.5, 33.0, 1.8, 0.8, 10, 250, '1 pouch'),
 ('Pasta, dry', 355, 12.5, 71.0, 1.6, 3.0, 5, null, null),
 ('Pasta, cooked', 158, 5.8, 31.0, 0.9, 1.8, 1, null, null),
 ('Oats, rolled', 375, 11.0, 61.0, 8.0, 9.0, 5, 40, '1 portion'),
 ('Potato, raw', 77, 2.0, 17.0, 0.1, 1.6, 6, null, null),
 ('Sweet potato, raw', 86, 1.6, 20.0, 0.1, 3.0, 55, null, null),
 ('Kumara, raw', 86, 1.6, 20.0, 0.1, 3.0, 55, null, null),
 ('Wholemeal bread', 230, 10.0, 41.0, 2.5, 7.0, 400, 40, '1 slice'),
 ('White bread', 240, 8.5, 46.0, 2.0, 2.5, 420, 40, '1 slice'),
 ('Sourdough bread', 250, 9.0, 49.0, 1.5, 2.5, 500, 50, '1 slice'),
 ('Bagel, plain', 260, 10.0, 50.0, 1.5, 2.5, 430, 85, '1 bagel'),
 ('Wrap, white', 300, 8.5, 50.0, 7.0, 2.5, 600, 62, '1 wrap'),
 ('Rice cakes', 385, 8.0, 81.0, 3.0, 3.5, 10, 8, '1 rice cake'),
 ('Cream of rice, dry', 370, 7.0, 82.0, 0.6, 0.7, 5, null, null),
 ('Granola', 450, 9.0, 60.0, 18.0, 6.0, 30, 45, '1 portion'),
 ('Weet-Bix / Weetabix', 360, 12.0, 67.0, 2.0, 10.0, 270, 19, '1 biscuit'),
 ('Couscous, dry', 360, 13.0, 72.0, 1.5, 5.0, 10, null, null),
 ('Quinoa, cooked', 120, 4.4, 21.0, 1.9, 2.8, 7, null, null),
 ('Baked beans', 80, 4.7, 12.5, 0.4, 3.7, 350, 200, 'half a tin'),
 ('Chickpeas, tinned, drained', 115, 7.0, 15.0, 2.5, 5.0, 250, null, null),
 ('Lentils, cooked', 115, 9.0, 17.0, 0.4, 7.5, 2, null, null),
 -- fruit
 ('Banana', 90, 1.1, 20.0, 0.3, 2.0, 1, 100, '1 medium (peeled)'),
 ('Apple', 52, 0.3, 12.0, 0.2, 2.0, 1, 150, '1 medium'),
 ('Blueberries', 57, 0.7, 12.0, 0.3, 2.4, 1, 80, '1 handful'),
 ('Strawberries', 32, 0.7, 6.0, 0.3, 2.0, 1, 80, '1 handful'),
 ('Raspberries', 52, 1.2, 5.5, 0.6, 6.5, 1, 80, '1 handful'),
 ('Frozen mixed berries', 45, 0.9, 8.0, 0.3, 4.0, 2, 80, '1 handful'),
 ('Orange', 47, 0.9, 10.0, 0.1, 2.0, 0, 140, '1 medium'),
 ('Kiwifruit', 61, 1.1, 11.0, 0.5, 3.0, 3, 75, '1 kiwifruit'),
 ('Grapes', 69, 0.7, 16.0, 0.2, 0.9, 2, 80, '1 handful'),
 ('Pineapple', 50, 0.5, 12.0, 0.1, 1.4, 1, 80, null),
 ('Mango', 60, 0.8, 14.0, 0.4, 1.6, 1, 80, null),
 ('Dates, dried', 280, 2.5, 67.0, 0.4, 7.0, 2, 8, '1 date'),
 ('Raisins', 300, 3.0, 69.0, 0.5, 4.0, 15, 30, '1 small box'),
 -- veg
 ('Broccoli', 34, 2.8, 4.5, 0.4, 2.6, 30, 80, '1 portion'),
 ('Spinach', 23, 2.9, 1.4, 0.4, 2.2, 80, 30, '1 handful'),
 ('Green beans', 31, 1.8, 4.5, 0.2, 3.0, 5, 80, null),
 ('Carrots', 41, 0.9, 8.0, 0.2, 2.8, 70, 80, '1 medium'),
 ('Mixed salad leaves', 17, 1.3, 2.0, 0.3, 1.5, 25, 30, '1 handful'),
 ('Cucumber', 15, 0.7, 2.5, 0.1, 0.5, 2, 80, null),
 ('Tomato', 18, 0.9, 3.0, 0.2, 1.2, 5, 85, '1 medium'),
 ('Bell pepper', 26, 1.0, 5.0, 0.3, 1.8, 3, 160, '1 pepper'),
 ('Onion', 40, 1.1, 8.0, 0.1, 1.7, 4, 150, '1 medium'),
 ('Mushrooms', 22, 3.1, 0.5, 0.3, 1.0, 5, 80, null),
 ('Courgette / zucchini', 17, 1.2, 2.5, 0.3, 1.0, 8, 80, null),
 ('Frozen mixed veg', 60, 3.0, 9.5, 0.5, 3.5, 30, 80, null),
 ('Asparagus', 20, 2.2, 2.0, 0.1, 2.0, 2, 80, null),
 ('Avocado', 160, 2.0, 2.0, 15.0, 6.7, 7, 70, 'half an avocado'),
 -- fats
 ('Olive oil', 884, 0, 0, 100.0, 0, 0, 5, '1 teaspoon'),
 ('Butter', 740, 0.6, 0.6, 82.0, 0, 640, 10, '1 knob'),
 ('Peanut butter', 600, 25.0, 13.0, 50.0, 7.0, 400, 15, '1 tablespoon'),
 ('Almonds', 600, 21.0, 7.0, 52.0, 12.5, 1, 30, '1 small handful'),
 ('Walnuts', 690, 15.0, 3.5, 68.0, 6.5, 2, 30, '1 small handful'),
 ('Chia seeds', 490, 17.0, 8.0, 31.0, 34.0, 15, 15, '1 tablespoon'),
 ('Dark chocolate, 70%', 600, 8.0, 36.0, 43.0, 11.0, 20, 20, '2 squares'),
 -- dairy and drinks
 ('Milk, semi-skimmed / light blue', 47, 3.5, 4.8, 1.7, 0, 45, 200, '1 glass'),
 ('Milk, skimmed / trim', 35, 3.5, 5.0, 0.2, 0, 45, 200, '1 glass'),
 ('Milk, whole / blue top', 64, 3.4, 4.7, 3.6, 0, 45, 200, '1 glass'),
 ('Almond drink, unsweetened', 13, 0.4, 0.1, 1.1, 0.3, 50, 200, '1 glass'),
 ('Oat drink', 45, 0.5, 6.5, 1.5, 0.8, 40, 200, '1 glass'),
 ('Orange juice', 45, 0.7, 10.0, 0.1, 0.2, 1, 200, '1 glass'),
 ('Flat white, semi-skimmed milk', 45, 3.0, 4.5, 1.7, 0, 40, 250, '1 regular'),
 -- condiments and extras
 ('Honey', 330, 0.3, 82.0, 0, 0, 5, 15, '1 tablespoon'),
 ('Jam', 250, 0.4, 62.0, 0.1, 1.0, 15, 15, '1 tablespoon'),
 ('Tomato ketchup', 110, 1.3, 25.0, 0.1, 0.5, 700, 15, '1 tablespoon'),
 ('Mayonnaise, light', 290, 0.7, 7.0, 28.0, 0, 750, 15, '1 tablespoon'),
 ('Soy sauce', 60, 8.0, 6.0, 0, 0.5, 5600, 10, '2 teaspoons'),
 ('Salsa', 35, 1.5, 6.0, 0.2, 1.5, 500, 30, null),
 ('Hummus', 300, 7.5, 13.0, 24.0, 5.0, 500, 30, '1 tablespoon'),
 ('Table salt', 0, 0, 0, 0, 0, 39300, 1, 'a pinch (1 g)'),
 ('Electrolyte powder (typical)', 300, 0, 75.0, 0, 0, 2500, 10, '1 sachet'),
 ('Sports drink', 25, 0, 6.0, 0, 0, 50, 500, '1 bottle'),
 ('Diet fizzy drink', 1, 0, 0, 0, 0, 10, 330, '1 can'),
 ('Protein bar (typical)', 370, 33.0, 35.0, 13.0, 8.0, 300, 60, '1 bar');

-- Mark the starter foods as standard foods (no coach foods exist yet when this runs).
update public.foods set source = 'generic' where owner_id is null and source = 'coach';
