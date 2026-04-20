-- ==============================================================================
-- IronLog — initial schema
-- ==============================================================================
-- Design notes:
--   - profiles mirror auth.users 1:1 (id = auth.users.id).
--   - routines are templates; sessions are actual executions (may diverge).
--   - sets are polymorphic by exercise_type (strength/cardio/isometric/bodyweight).
--   - user_id is denormalized down to session_exercises and sets so RLS checks
--     never need multi-level joins.
--   - All auth.uid()/auth.role() calls inside RLS are wrapped in SELECT to be
--     cached once per statement instead of re-evaluated per row.
-- ==============================================================================


-- ==============================================================================
-- 1. EXTENSIONS & TYPES
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TYPE exercise_type AS ENUM ('strength', 'cardio', 'isometric', 'bodyweight');


-- ==============================================================================
-- 2. TABLES
-- ==============================================================================

-- PROFILES -------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  age INT CHECK (age IS NULL OR (age > 0 AND age < 120)),
  weight_kg NUMERIC(5,2) CHECK (weight_kg IS NULL OR weight_kg > 0),
  goal TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_username_trgm ON profiles USING gin (username gin_trgm_ops);

-- FOLLOWS --------------------------------------------------------------------
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

-- Reverse lookup: "who follows user X" (needed for feed + notifications)
CREATE INDEX idx_follows_following ON follows(following_id);

-- EXERCISES (global catalog) -------------------------------------------------
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  target_muscle TEXT,
  equipment TEXT,
  type exercise_type NOT NULL DEFAULT 'strength',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exercises_type ON exercises(type);
CREATE INDEX idx_exercises_name_trgm ON exercises USING gin (name gin_trgm_ops);

-- ROUTINES (templates) -------------------------------------------------------
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_routines_user ON routines(user_id);

-- ROUTINE_EXERCISES (template items) -----------------------------------------
CREATE TABLE routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  target_sets INT CHECK (target_sets IS NULL OR target_sets > 0),
  target_reps INT CHECK (target_reps IS NULL OR target_reps > 0),
  target_weight_kg NUMERIC(6,2) CHECK (target_weight_kg IS NULL OR target_weight_kg >= 0),
  target_duration_seconds INT CHECK (target_duration_seconds IS NULL OR target_duration_seconds > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (routine_id, order_index)
);

CREATE INDEX idx_routine_exercises_routine ON routine_exercises(routine_id);
CREATE INDEX idx_routine_exercises_exercise ON routine_exercises(exercise_id);
CREATE INDEX idx_routine_exercises_user ON routine_exercises(user_id);

-- SESSIONS (actual workouts) -------------------------------------------------
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id UUID REFERENCES routines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ended_after_started CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Critical for the social feed (paginated by started_at DESC)
CREATE INDEX idx_sessions_user_started ON sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_routine ON sessions(routine_id) WHERE routine_id IS NOT NULL;

-- SESSION_EXERCISES ----------------------------------------------------------
CREATE TABLE session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, order_index)
);

CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);
CREATE INDEX idx_session_exercises_exercise ON session_exercises(exercise_id);
CREATE INDEX idx_session_exercises_user ON session_exercises(user_id);

-- SETS -----------------------------------------------------------------------
CREATE TABLE sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  set_number INT NOT NULL,
  reps INT,
  weight_kg NUMERIC(6,2),
  duration_seconds INT,
  distance_meters INT,
  rpe INT CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  is_pr BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_exercise_id, set_number),
  CONSTRAINT set_has_metric CHECK (
    reps IS NOT NULL
    OR duration_seconds IS NOT NULL
    OR distance_meters IS NOT NULL
  ),
  CONSTRAINT positive_metrics CHECK (
    (reps IS NULL OR reps >= 0)
    AND (weight_kg IS NULL OR weight_kg >= 0)
    AND (duration_seconds IS NULL OR duration_seconds >= 0)
    AND (distance_meters IS NULL OR distance_meters >= 0)
  )
);

CREATE INDEX idx_sets_session_exercise ON sets(session_exercise_id);
CREATE INDEX idx_sets_user ON sets(user_id);
CREATE INDEX idx_sets_user_exercise ON sets(user_id, exercise_id);
CREATE INDEX idx_sets_pr ON sets(user_id, exercise_id) WHERE is_pr = true;


-- ==============================================================================
-- 3. TRIGGERS — updated_at maintenance
-- ==============================================================================

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER routines_set_updated_at
  BEFORE UPDATE ON routines
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);

CREATE TRIGGER sessions_set_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE PROCEDURE moddatetime(updated_at);


-- ==============================================================================
-- 4. TRIGGERS — denormalization (keep user_id / exercise_id in sync)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.set_session_exercise_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM sessions WHERE id = NEW.session_id;
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Parent session % does not exist', NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER session_exercises_fill_user_id
  BEFORE INSERT ON session_exercises
  FOR EACH ROW EXECUTE PROCEDURE public.set_session_exercise_user_id();


CREATE OR REPLACE FUNCTION public.set_set_denormalized_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT user_id, exercise_id
    INTO NEW.user_id, NEW.exercise_id
  FROM session_exercises
  WHERE id = NEW.session_exercise_id;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Parent session_exercise % does not exist', NEW.session_exercise_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sets_fill_denormalized
  BEFORE INSERT ON sets
  FOR EACH ROW EXECUTE PROCEDURE public.set_set_denormalized_fields();


CREATE OR REPLACE FUNCTION public.set_routine_exercise_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM routines WHERE id = NEW.routine_id;
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Parent routine % does not exist', NEW.routine_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER routine_exercises_fill_user_id
  BEFORE INSERT ON routine_exercises
  FOR EACH ROW EXECUTE PROCEDURE public.set_routine_exercise_user_id();


-- ==============================================================================
-- 5. TRIGGERS — is_pr maintenance
-- ==============================================================================
-- Strategy: when a strength/bodyweight set is inserted, mark as PR if weight_kg
-- is strictly greater than every previous set of the same (user, exercise).
-- Demote previous PRs of that (user, exercise) that are now beaten.
-- Cardio/isometric use duration or distance respectively; we pick the relevant
-- metric based on the exercise type.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.recompute_is_pr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ex_type exercise_type;
  current_best NUMERIC;
  new_value NUMERIC;
BEGIN
  SELECT type INTO ex_type FROM exercises WHERE id = NEW.exercise_id;

  new_value := CASE ex_type
    WHEN 'strength'   THEN NEW.weight_kg
    WHEN 'bodyweight' THEN NEW.reps
    WHEN 'isometric'  THEN NEW.duration_seconds
    WHEN 'cardio'     THEN NEW.distance_meters
  END;

  IF new_value IS NULL THEN
    NEW.is_pr := false;
    RETURN NEW;
  END IF;

  SELECT MAX(
    CASE ex_type
      WHEN 'strength'   THEN weight_kg
      WHEN 'bodyweight' THEN reps
      WHEN 'isometric'  THEN duration_seconds
      WHEN 'cardio'     THEN distance_meters
    END
  )
  INTO current_best
  FROM sets
  WHERE user_id = NEW.user_id
    AND exercise_id = NEW.exercise_id
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF current_best IS NULL OR new_value > current_best THEN
    NEW.is_pr := true;
    -- Demote previous PRs beaten by this one
    UPDATE sets
       SET is_pr = false
     WHERE user_id = NEW.user_id
       AND exercise_id = NEW.exercise_id
       AND is_pr = true;
  ELSE
    NEW.is_pr := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sets_recompute_is_pr
  BEFORE INSERT ON sets
  FOR EACH ROW EXECUTE PROCEDURE public.recompute_is_pr();


-- ==============================================================================
-- 6. TRIGGER — auto-create profile on auth.users insert
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  base_username TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );
  candidate := base_username;

  -- Retry on username collision instead of aborting the signup
  LOOP
    BEGIN
      INSERT INTO public.profiles (id, username, full_name, avatar_url)
      VALUES (
        NEW.id,
        candidate,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
      );
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      suffix := suffix + 1;
      candidate := base_username || '_' || suffix;
      IF suffix > 50 THEN
        RAISE EXCEPTION 'Could not allocate a unique username for %', NEW.id;
      END IF;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==============================================================================
-- 7. ROW LEVEL SECURITY
-- ==============================================================================
-- Key ideas:
--   - Wrap auth.uid() in (SELECT auth.uid()) so Postgres treats it as a stable
--     expression and evaluates it once per statement.
--   - user_id is denormalized on every child table so policies never join.
--   - Social read access checks `follows` once per row against a cached uid.
-- ==============================================================================

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises          ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets               ENABLE ROW LEVEL SECURITY;

-- PROFILES -------------------------------------------------------------------
-- Public profiles are readable by any authenticated user. Private profiles are
-- only readable by the owner and their followers.
CREATE POLICY "profiles_select_public_or_owner_or_follower"
  ON profiles FOR SELECT
  USING (
    is_public
    OR id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = (SELECT auth.uid())
        AND following_id = profiles.id
    )
  );

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- No INSERT/DELETE policies: profiles are created by the handle_new_user trigger
-- (SECURITY DEFINER bypasses RLS) and removed via ON DELETE CASCADE from auth.users.

-- FOLLOWS --------------------------------------------------------------------
CREATE POLICY "follows_select_involved"
  ON follows FOR SELECT
  USING (
    (SELECT auth.uid()) = follower_id
    OR (SELECT auth.uid()) = following_id
  );

CREATE POLICY "follows_insert_as_follower"
  ON follows FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = follower_id);

CREATE POLICY "follows_delete_as_follower"
  ON follows FOR DELETE
  USING ((SELECT auth.uid()) = follower_id);

-- EXERCISES (global catalog) -------------------------------------------------
-- Anyone authenticated can read. Writes go through service_role only (migrations
-- or admin endpoints); no client-side policy.
CREATE POLICY "exercises_select_authenticated"
  ON exercises FOR SELECT
  USING ((SELECT auth.role()) = 'authenticated');

-- ROUTINES -------------------------------------------------------------------
CREATE POLICY "routines_select_own"
  ON routines FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "routines_insert_own"
  ON routines FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "routines_update_own"
  ON routines FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "routines_delete_own"
  ON routines FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ROUTINE_EXERCISES ----------------------------------------------------------
CREATE POLICY "routine_exercises_select_own"
  ON routine_exercises FOR SELECT
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "routine_exercises_insert_own"
  ON routine_exercises FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "routine_exercises_update_own"
  ON routine_exercises FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "routine_exercises_delete_own"
  ON routine_exercises FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- SESSIONS -------------------------------------------------------------------
CREATE POLICY "sessions_select_own_or_following"
  ON sessions FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = (SELECT auth.uid())
        AND following_id = sessions.user_id
    )
  );

CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "sessions_update_own"
  ON sessions FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- SESSION_EXERCISES ----------------------------------------------------------
-- Thanks to the denormalized user_id these policies are single-table checks,
-- no joins at all. The denorm is maintained by the BEFORE INSERT trigger.
CREATE POLICY "session_exercises_select_own_or_following"
  ON session_exercises FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = (SELECT auth.uid())
        AND following_id = session_exercises.user_id
    )
  );

CREATE POLICY "session_exercises_insert_own"
  ON session_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE id = session_exercises.session_id
        AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "session_exercises_update_own"
  ON session_exercises FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "session_exercises_delete_own"
  ON session_exercises FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- SETS -----------------------------------------------------------------------
CREATE POLICY "sets_select_own_or_following"
  ON sets FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = (SELECT auth.uid())
        AND following_id = sets.user_id
    )
  );

CREATE POLICY "sets_insert_own"
  ON sets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM session_exercises
      WHERE id = sets.session_exercise_id
        AND user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "sets_update_own"
  ON sets FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "sets_delete_own"
  ON sets FOR DELETE
  USING (user_id = (SELECT auth.uid()));


-- ==============================================================================
-- 8. SEED — starter exercise catalog
-- ==============================================================================

INSERT INTO exercises (name, target_muscle, equipment, type) VALUES
  -- PECHO (Fuerza y Peso Corporal)
  ('Press de Banca Plano',          'Pecho',    'Barra',      'strength'),
  ('Press de Banca Inclinado',      'Pecho',    'Mancuernas', 'strength'),
  ('Aperturas con Mancuernas',      'Pecho',    'Mancuernas', 'strength'),
  ('Cruces en Polea',               'Pecho',    'Polea',      'strength'),
  ('Flexiones (Push-ups)',          'Pecho',    'Ninguno',    'bodyweight'),
  ('Fondos en Paralelas (Dips)',    'Pecho',    'Ninguno',    'bodyweight'),

  -- ESPALDA (Fuerza y Peso Corporal)
  ('Peso Muerto Tradicional',       'Espalda',  'Barra',      'strength'),
  ('Remo con Barra',                'Espalda',  'Barra',      'strength'),
  ('Remo con Mancuerna (Serrucho)', 'Espalda',  'Mancuernas', 'strength'),
  ('Jalón al Pecho',                'Espalda',  'Polea',      'strength'),
  ('Pullover',                      'Espalda',  'Mancuernas', 'strength'),
  ('Dominadas (Pull-ups)',          'Espalda',  'Ninguno',    'bodyweight'),
  ('Dominadas Supinas (Chin-ups)',  'Espalda',  'Ninguno',    'bodyweight'),

  -- PIERNAS (Fuerza y Peso Corporal)
  ('Sentadilla Libre',              'Piernas',  'Barra',      'strength'),
  ('Prensa de Piernas',             'Piernas',  'Máquina',    'strength'),
  ('Peso Muerto Rumano',            'Piernas',  'Barra',      'strength'),
  ('Sentadilla Búlgara',            'Piernas',  'Mancuernas', 'strength'),
  ('Extensión de Cuádriceps',       'Piernas',  'Máquina',    'strength'),
  ('Curl Femoral',                  'Piernas',  'Máquina',    'strength'),
  ('Elevación de Talones (Gemelos)','Piernas',  'Máquina',    'strength'),
  ('Zancadas (Lunges)',             'Piernas',  'Ninguno',    'bodyweight'),

  -- HOMBROS (Fuerza)
  ('Press Militar',                 'Hombros',  'Barra',      'strength'),
  ('Press Arnold',                  'Hombros',  'Mancuernas', 'strength'),
  ('Elevaciones Laterales',         'Hombros',  'Mancuernas', 'strength'),
  ('Elevaciones Frontales',         'Hombros',  'Polea',      'strength'),
  ('Pájaros (Deltoides Posterior)', 'Hombros',  'Mancuernas', 'strength'),

  -- BRAZOS: BÍCEPS Y TRÍCEPS (Fuerza)
  ('Curl de Bíceps con Barra',      'Brazos',   'Barra',      'strength'),
  ('Curl Martillo',                 'Brazos',   'Mancuernas', 'strength'),
  ('Curl en Banco Scott',           'Brazos',   'Máquina',    'strength'),
  ('Extensión de Tríceps en Polea', 'Brazos',   'Polea',      'strength'),
  ('Press Francés',                 'Brazos',   'Barra Z',    'strength'),
  ('Extensión Tras Nuca',           'Brazos',   'Mancuernas', 'strength'),

  -- CORE (Isométrico y Fuerza)
  ('Plancha Abdominal (Plank)',     'Core',     'Ninguno',    'isometric'),
  ('Plancha Lateral',               'Core',     'Ninguno',    'isometric'),
  ('Hollow Hold',                   'Core',     'Ninguno',    'isometric'),
  ('Crunch Abdominal en Polea',     'Core',     'Polea',      'strength'),
  ('Elevación de Piernas Colgado',  'Core',     'Ninguno',    'bodyweight'),

  -- CARDIO
  ('Cinta de Correr',               'Cardio',   'Máquina',    'cardio'),
  ('Bicicleta Estática',            'Cardio',   'Máquina',    'cardio'),
  ('Remo Ergómetro',                'Cardio',   'Máquina',    'cardio'),
  ('Elíptica',                      'Cardio',   'Máquina',    'cardio'),
  ('Escaladora (Stairmaster)',      'Cardio',   'Máquina',    'cardio'),
  ('Salto a la Comba',              'Cardio',   'Equipamiento','cardio')

ON CONFLICT (name) DO NOTHING;
