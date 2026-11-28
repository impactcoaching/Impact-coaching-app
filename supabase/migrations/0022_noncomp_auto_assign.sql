-- 0022: non-competitor trial clients get a programme automatically too (Adam, 28 Nov 2026).
-- Needs 0020 and the 0021 programmes. Women or men, their goal (fat loss, build muscle, or strength and fitness for
-- health and performance), days a week, and the full gym or home version from the equipment ticked for their main gym.
-- Competitors in a class without its own set (Other) get the build muscle programme. Health-flagged trials are still held.
-- Safe to run more than once. Run the whole file in one go.

-- ---------- pick and copy the templates for one trial client ----------
-- Internal: called by start_trial() only, never by a client directly.
create or replace function public.assign_trial(me uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  i record;
  t record;
  w jsonb;
  x jsonb;
  dt jsonb;
  m jsonb;
  it jsonb;
  cls text;
  days int;
  wd int[];
  train_days int[] := '{}';
  new_prog uuid;
  new_w uuid;
  new_plan uuid;
  new_dt uuid;
  new_m uuid;
  ex_id uuid;
  food uuid;
  pos int;
  xpos int;
  yrs numeric;
  tdee numeric;
  want numeric;
  band int;
  diet text;
  style text;
  got_training text;
  got_nutrition text;
  kit text[];
  nc text;
  have_t boolean := false;
begin
  select * into i from public.client_intake where client_id = me;
  if not found or i.screening_flag then
    return jsonb_build_object('held', true);
  end if;

  -- ----- training: the class programme for competitors, otherwise the non-competitor one -----
  if i.competes and i.division is not null then
    cls := case i.division
      when 'Bodybuilding' then case i.sex when 'female' then 'Women''s bodybuilding' when 'male' then 'Men''s bodybuilding' end
      when 'Fitness' then 'Figure'
      else i.division end;
    days := least(6, greatest(3, coalesce(i.days_per_week, 4)));
    select * into t from public.templates where kind = 'training' and name = cls || ': ' || coalesce(i.focus, '') || ', ' || days || ' days';
    if not found then
      -- No focus picked: the class's main focus area.
      select * into t from public.templates where kind = 'training' and name = cls || ': ' || case cls
        when 'Bikini' then 'Glutes' when 'Wellness' then 'Glutes' when 'Figure' then 'Shoulders'
        when 'Women''s physique' then 'Back' when 'Women''s bodybuilding' then 'Back' when 'Men''s physique' then 'Upper chest'
        when 'Classic physique' then 'Chest' when 'Men''s bodybuilding' then 'Back' else '' end || ', ' || days || ' days';
    end if;
    have_t := found;
  end if;
  if not have_t and i.sex is not null then
    days := least(6, greatest(3, coalesce(i.days_per_week, 3)));
    select coalesce(equipment, '{}') into kit from public.gyms where client_id = me order by is_main desc, created_at limit 1;
    nc := case i.sex when 'female' then 'Women' else 'Men' end || ': '
      || case i.goal when 'fat_loss' then 'Fat loss' when 'health' then 'Strength and fitness' when 'performance' then 'Strength and fitness'
           else 'Build muscle' end
      || ', ' || days || ' days'
      -- The full gym version needs the main machines; otherwise dumbbells, a bench and bands.
      || case when coalesce(kit, '{}') @> array['cable', 'pulldown', 'legpress', 'legcurl'] then '' else ', home' end;
    select * into t from public.templates where kind = 'training' and competitor = 'no' and name = nc;
    have_t := found;
  end if;
  if have_t then
      insert into public.programmes (client_id, name, notes, is_live, template_name)
        values (me, t.name, t.body->>'notes', true, t.name) returning id into new_prog;
      pos := 0;
      for w in select * from jsonb_array_elements(coalesce(t.body->'workouts', '[]'::jsonb)) loop
        wd := coalesce((select array_agg(v::int) from jsonb_array_elements_text(coalesce(w->'weekdays', '[]'::jsonb)) v), '{}');
        insert into public.workouts (programme_id, client_id, name, position, weekdays)
          values (new_prog, me, coalesce(w->>'name', 'Workout ' || (pos + 1)), pos, wd::smallint[]) returning id into new_w;
        train_days := train_days || wd;
        xpos := 0;
        for x in select * from jsonb_array_elements(coalesce(w->'exercises', '[]'::jsonb)) loop
          select id into ex_id from public.exercises where lower(name) = lower(x->>'exercise') limit 1;
          continue when ex_id is null;
          insert into public.workout_exercises (workout_id, client_id, exercise_id, position, linked_to_previous, warmup_sets, work_sets,
              reps_type, reps_min, reps_max, tempo, effort_type, effort_value, rest_seconds, intensifier, intensifier_on, film_set, notes)
            values (new_w, me, ex_id, xpos, xpos > 0 and coalesce((x->>'linked_to_previous')::boolean, false),
              coalesce((x->>'warmup_sets')::int, 0), coalesce((x->>'work_sets')::int, 3), coalesce(x->>'reps_type', 'range'),
              (x->>'reps_min')::int, (x->>'reps_max')::int, x->>'tempo', coalesce(x->>'effort_type', 'RIR'), x->>'effort_value',
              coalesce((x->>'rest_seconds')::int, 90), nullif(x->'intensifier', 'null'::jsonb), coalesce(x->>'intensifier_on', 'last'),
              (x->>'film_set')::int, x->>'notes');
          xpos := xpos + 1;
        end loop;
        pos := pos + 1;
      end loop;
      got_training := t.name;
  end if;

  -- ----- nutrition: everyone, unless something means Adam should set it -----
  diet := coalesce(i.dietary_needs, '') || ' ' || coalesce(i.screening_details, '');
  if diet !~* '(pregnan|breastfeed|eating disorder|anorexi|bulimi|binge|diabet|coeliac|celiac|kidney|crohn|colitis|ibs|medical|medication|allerg)'
     and i.date_of_birth is not null and i.height_cm is not null and i.start_weight_kg is not null and i.sex is not null then
    yrs := extract(year from age(i.date_of_birth));
    -- Mifflin-St Jeor, then an activity factor from training days a week.
    tdee := (10 * i.start_weight_kg + 6.25 * i.height_cm - 5 * yrs + case when i.sex = 'male' then 5 else -161 end)
      * case when coalesce(i.days_per_week, 3) <= 2 then 1.375 when i.days_per_week = 3 then 1.45 when i.days_per_week = 4 then 1.5
             when i.days_per_week = 5 then 1.55 else 1.65 end;
    -- Gentle changes only: never more than about 15% (and 500 kcal) under, 10% over.
    want := case
      when i.goal = 'fat_loss' then greatest(tdee * 0.85, tdee - 500)
      when i.goal = 'competition' then greatest(tdee * 0.9, tdee - 500)
      when i.goal = 'muscle' then tdee * 1.1
      else tdee end;
    band := least(4000, greatest(1400, (round(want / 200) * 200)::int));
    style := case
      when coalesce(i.dietary_needs, '') ~* '(vegan|plant.based)' then 'Vegan'
      when coalesce(i.dietary_needs, '') ~* '(vegetarian|veggie|no meat|pescatarian)' then 'Vegetarian'
      when i.goal in ('muscle', 'competition') or i.competes then 'High protein'
      else 'Balanced' end;
    select * into t from public.templates where kind = 'nutrition' and name = style || ', ' || to_char(band, 'FM9,999') || ' kcal';
    if found then
      insert into public.nutrition_plans (client_id, style, notes, is_live, template_name)
        values (me, coalesce(t.body->>'style', 'plan'), t.body->>'notes', true, t.name) returning id into new_plan;
      pos := 0;
      for dt in select * from jsonb_array_elements(coalesce(t.body->'day_types', '[]'::jsonb)) loop
        wd := coalesce((select array_agg(v::int) from jsonb_array_elements_text(coalesce(dt->'weekdays', '[]'::jsonb)) v), '{}');
        -- Match training and rest days to the days their programme is on.
        if cardinality(train_days) > 0 then
          if dt->>'name' = 'Training day' then
            wd := (select array_agg(distinct d order by d) from unnest(train_days) d);
          elsif dt->>'name' = 'Rest day' then
            wd := (select coalesce(array_agg(d order by d), '{}') from generate_series(1, 7) d where d <> all (train_days));
          end if;
        end if;
        insert into public.day_types (plan_id, client_id, name, position, weekdays, kcal, protein_g, carbs_g, fat_g, fibre_g,
            palms, fists, cupped, thumbs, notes)
          values (new_plan, me, coalesce(dt->>'name', 'Day ' || (pos + 1)), pos, wd,
            (dt->>'kcal')::int, (dt->>'protein_g')::int, (dt->>'carbs_g')::int, (dt->>'fat_g')::int, (dt->>'fibre_g')::int,
            (dt->>'palms')::numeric, (dt->>'fists')::numeric, (dt->>'cupped')::numeric, (dt->>'thumbs')::numeric, dt->>'notes')
          returning id into new_dt;  -- sodium and water stay empty: coach-set only
        xpos := 0;
        for m in select * from jsonb_array_elements(coalesce(dt->'meals', '[]'::jsonb)) loop
          insert into public.plan_meals (day_type_id, client_id, name, position, notes)
            values (new_dt, me, coalesce(m->>'name', 'Meal ' || (xpos + 1)), xpos, m->>'notes') returning id into new_m;
          for it in select * from jsonb_array_elements(coalesce(m->'items', '[]'::jsonb)) loop
            select id into food from public.foods where owner_id is null and lower(name) = lower(it->>'food')
              order by (brand is null) desc, created_at limit 1;
            continue when food is null or coalesce((it->>'grams')::numeric, 0) <= 0;
            insert into public.plan_meal_items (meal_id, client_id, food_id, grams, position)
              values (new_m, me, food, least(5000, (it->>'grams')::numeric), (select count(*) from public.plan_meal_items where meal_id = new_m));
          end loop;
          xpos := xpos + 1;
        end loop;
        pos := pos + 1;
      end loop;
      got_nutrition := t.name;
    end if;
  end if;

  return jsonb_build_object('training', got_training, 'nutrition', got_nutrition);
end;
$$;

revoke all on function public.assign_trial(uuid) from public, anon, authenticated;

