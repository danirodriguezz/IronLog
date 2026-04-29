-- =============================================================================
-- IronLog — Seed de datos de ejemplo (solo local)
-- Uso: supabase db reset   (borra todo y vuelve a aplicar migrations + este seed)
--      o pegarlo en el SQL Editor de Supabase Studio (http://127.0.0.1:54323)
-- Para limpiar solo el seed: ejecuta el bloque DELETE del final.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Usuario de prueba en auth.users
--    Email: demo@ironlog.local  |  Password: demo1234
-- -----------------------------------------------------------------------------
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change,
  email_change_token_current, reauthentication_token,
  phone_change, phone_change_token,
  is_sso_user, is_anonymous
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'demo@ironlog.local',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"username":"demo_user"}',
  '', '', '', '', '', '', '', '',
  false, false
)
ON CONFLICT (id) DO NOTHING;

-- Supabase requiere una fila en auth.identities para login con email/password
INSERT INTO auth.identities (
  id, user_id, provider_id, provider,
  identity_data, last_sign_in_at, created_at, updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'demo@ironlog.local',
  'email',
  jsonb_build_object(
    'sub',   '00000000-0000-0000-0000-000000000001',
    'email', 'demo@ironlog.local',
    'email_verified', true
  ),
  now(), now(), now()
)
ON CONFLICT (id) DO NOTHING;

-- El trigger handle_new_user crea el perfil automáticamente,
-- pero lo insertamos explícitamente por si acaso.
INSERT INTO profiles (id, username, full_name, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo_user',
  'Usuario Demo',
  null
)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Variables locales con los IDs de ejercicios del catálogo
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  uid          uuid := '00000000-0000-0000-0000-000000000001';

  -- Ejercicios de fuerza
  ex_banca     uuid;
  ex_sentadilla uuid;
  ex_peso_muerto uuid;
  ex_press_militar uuid;
  ex_curl_biceps uuid;

  -- Ejercicios bodyweight
  ex_dominadas uuid;
  ex_flexiones uuid;

  -- Cardio
  ex_carrera   uuid;

  -- Rutina
  rutina_id    uuid := gen_random_uuid();

  -- Sesiones (12 semanas de historial)
  s_ids        uuid[];
  s_id         uuid;
  sess_ex_id   uuid;

  -- Contadores
  i            int;
  semana       int;
  base_date    date := current_date - interval '84 days'; -- 12 semanas atrás
  sess_date    date;
  sess_start   timestamptz;
  sess_end     timestamptz;

  -- Progresión de cargas (simula mejora a lo largo del tiempo)
  banca_kg     numeric;
  sq_kg        numeric;
  dl_kg        numeric;
  ohp_kg       numeric;
  curl_kg      numeric;

BEGIN

  -- Obtener IDs de ejercicios del catálogo
  SELECT id INTO ex_banca         FROM exercises WHERE name = 'Press de Banca Plano'         LIMIT 1;
  SELECT id INTO ex_sentadilla    FROM exercises WHERE name = 'Sentadilla Libre (Back Squat)' LIMIT 1;
  SELECT id INTO ex_peso_muerto   FROM exercises WHERE name = 'Peso Muerto Tradicional'       LIMIT 1;
  SELECT id INTO ex_press_militar FROM exercises WHERE name = 'Press Militar con Barra'       LIMIT 1;
  SELECT id INTO ex_curl_biceps   FROM exercises WHERE name = 'Curl de Bíceps con Barra'      LIMIT 1;
  SELECT id INTO ex_dominadas     FROM exercises WHERE name = 'Dominadas (Pull-ups)'           LIMIT 1;
  SELECT id INTO ex_flexiones     FROM exercises WHERE name = 'Flexiones (Push-ups)'           LIMIT 1;
  SELECT id INTO ex_carrera       FROM exercises WHERE name = 'Carrera Continua (Exterior)'   LIMIT 1;

  -- Salir si no hay catálogo cargado
  IF ex_banca IS NULL THEN
    RAISE EXCEPTION 'Catálogo de ejercicios no encontrado. Asegúrate de haber aplicado las migrations.';
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Rutina de ejemplo
  -- -------------------------------------------------------------------------
  INSERT INTO routines (id, user_id, name, description)
  VALUES (rutina_id, uid, 'Powerlifting 3x/semana', 'Rutina base con los tres levantamientos principales.')
  ON CONFLICT DO NOTHING;

  INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps)
  VALUES
    (rutina_id, ex_banca,        1, 4, 5),
    (rutina_id, ex_sentadilla,   2, 4, 5),
    (rutina_id, ex_peso_muerto,  3, 3, 3),
    (rutina_id, ex_press_militar,4, 3, 8),
    (rutina_id, ex_dominadas,    5, 3, 8)
  ON CONFLICT DO NOTHING;

  -- -------------------------------------------------------------------------
  -- 4. Sesiones — 12 semanas, 3 sesiones/semana (lun/mié/vie)
  -- -------------------------------------------------------------------------
  FOR semana IN 1..12 LOOP

    -- Lunes
    sess_date  := base_date + ((semana - 1) * 7);
    sess_start := sess_date::timestamptz + interval '18 hours';
    sess_end   := sess_start + interval '75 minutes';
    s_id       := gen_random_uuid();

    -- Progresión lineal simple: +2.5 kg cada semana en banca/press, +5 kg en sq/dl
    banca_kg  := 80  + (semana - 1) * 2.5;
    sq_kg     := 100 + (semana - 1) * 5;
    dl_kg     := 120 + (semana - 1) * 5;
    ohp_kg    := 55  + (semana - 1) * 1.25;
    curl_kg   := 30  + (semana - 1) * 1.25;

    INSERT INTO sessions (id, user_id, routine_id, name, started_at, ended_at, status)
    VALUES (s_id, uid, rutina_id, 'Día A — Empuje', sess_start, sess_end, 'completed');

    -- Press de Banca: 4 series de 5
    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_banca, 1)
    RETURNING id INTO sess_ex_id;

    FOR i IN 1..4 LOOP
      INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
      VALUES (sess_ex_id, ex_banca, i, 5, banca_kg + CASE WHEN i = 4 THEN 2.5 ELSE 0 END,
              CASE WHEN i <= 2 THEN 7 WHEN i = 3 THEN 8 ELSE 9 END);
    END LOOP;

    -- Press Militar: 3 series de 8
    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_press_militar, 2)
    RETURNING id INTO sess_ex_id;

    FOR i IN 1..3 LOOP
      INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
      VALUES (sess_ex_id, ex_press_militar, i, 8, ohp_kg, 7 + i - 1);
    END LOOP;

    -- Dominadas: 3 series de 8-10 reps (bodyweight)
    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_dominadas, 3)
    RETURNING id INTO sess_ex_id;

    FOR i IN 1..3 LOOP
      INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
      VALUES (sess_ex_id, ex_dominadas, i, 8 + i, 0, 7 + i - 1);
    END LOOP;

    -- -----------------------------------------------------------------------
    -- Miércoles — Sentadilla + Curl
    -- -----------------------------------------------------------------------
    sess_date  := base_date + ((semana - 1) * 7) + 2;
    sess_start := sess_date::timestamptz + interval '19 hours';
    sess_end   := sess_start + interval '80 minutes';
    s_id       := gen_random_uuid();

    INSERT INTO sessions (id, user_id, routine_id, name, started_at, ended_at, status)
    VALUES (s_id, uid, rutina_id, 'Día B — Piernas', sess_start, sess_end, 'completed');

    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_sentadilla, 1)
    RETURNING id INTO sess_ex_id;

    FOR i IN 1..4 LOOP
      INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
      VALUES (sess_ex_id, ex_sentadilla, i, 5, sq_kg + CASE WHEN i = 4 THEN 5 ELSE 0 END,
              CASE WHEN i <= 2 THEN 7 WHEN i = 3 THEN 8 ELSE 9 END);
    END LOOP;

    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_curl_biceps, 2)
    RETURNING id INTO sess_ex_id;

    FOR i IN 1..3 LOOP
      INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
      VALUES (sess_ex_id, ex_curl_biceps, i, 10, curl_kg, 7);
    END LOOP;

    -- Flexiones al final
    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_flexiones, 3)
    RETURNING id INTO sess_ex_id;

    FOR i IN 1..3 LOOP
      INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
      VALUES (sess_ex_id, ex_flexiones, i, 15 + i * 5, 0, 7);
    END LOOP;

    -- -----------------------------------------------------------------------
    -- Viernes — Peso Muerto
    -- -----------------------------------------------------------------------
    sess_date  := base_date + ((semana - 1) * 7) + 4;
    sess_start := sess_date::timestamptz + interval '18 hours' + interval '30 minutes';
    sess_end   := sess_start + interval '70 minutes';
    s_id       := gen_random_uuid();

    INSERT INTO sessions (id, user_id, routine_id, name, started_at, ended_at, status)
    VALUES (s_id, uid, rutina_id, 'Día C — Tirón', sess_start, sess_end, 'completed');

    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_peso_muerto, 1)
    RETURNING id INTO sess_ex_id;

    -- Peso Muerto: 1 serie pesada + 2 series de trabajo
    INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
    VALUES (sess_ex_id, ex_peso_muerto, 1, 5, dl_kg - 20, 7);
    INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
    VALUES (sess_ex_id, ex_peso_muerto, 2, 3, dl_kg, 8);
    INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
    VALUES (sess_ex_id, ex_peso_muerto, 3, 1, dl_kg + 10, 9);

    -- Dominadas al final de tirón también
    INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
    VALUES (gen_random_uuid(), s_id, ex_dominadas, 2)
    RETURNING id INTO sess_ex_id;

    FOR i IN 1..4 LOOP
      INSERT INTO sets (session_exercise_id, exercise_id, set_number, reps, weight_kg, rpe)
      VALUES (sess_ex_id, ex_dominadas, i, 6 + i, 0, 7 + i - 1);
    END LOOP;

    -- Carrera (cardio) — solo las semanas pares como "cardio day" adicional
    IF semana % 2 = 0 THEN
      sess_date  := base_date + ((semana - 1) * 7) + 6; -- sábado
      sess_start := sess_date::timestamptz + interval '9 hours';
      sess_end   := sess_start + interval '35 minutes';
      s_id       := gen_random_uuid();

      INSERT INTO sessions (id, user_id, routine_id, name, started_at, ended_at, status)
      VALUES (s_id, uid, NULL, 'Cardio — Carrera', sess_start, sess_end, 'completed');

      INSERT INTO session_exercises (id, session_id, exercise_id, order_index)
      VALUES (gen_random_uuid(), s_id, ex_carrera, 1)
      RETURNING id INTO sess_ex_id;

      INSERT INTO sets (session_exercise_id, exercise_id, set_number, distance_meters, duration_seconds, rpe)
      VALUES (sess_ex_id, ex_carrera, 1, 5000 + semana * 100, 1800 + semana * 30, 7);
    END IF;

  END LOOP; -- fin semanas

  RAISE NOTICE '✅ Seed completado: 12 semanas de entrenamiento para demo@ironlog.local';

END $$;

-- =============================================================================
-- Para BORRAR solo los datos del seed (sin resetear la BD):
-- =============================================================================
-- DELETE FROM sessions  WHERE user_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM routines  WHERE user_id = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM profiles  WHERE id      = '00000000-0000-0000-0000-000000000001';
-- DELETE FROM auth.users WHERE id     = '00000000-0000-0000-0000-000000000001';
