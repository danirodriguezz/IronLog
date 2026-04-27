drop extension if exists "pg_net";

drop trigger if exists "follows_set_status" on "public"."follows";

drop trigger if exists "profiles_auto_accept_follows" on "public"."profiles";

drop trigger if exists "profiles_set_updated_at" on "public"."profiles";

drop trigger if exists "routine_exercises_fill_user_id" on "public"."routine_exercises";

drop trigger if exists "routines_set_updated_at" on "public"."routines";

drop trigger if exists "session_exercises_fill_user_id" on "public"."session_exercises";

drop trigger if exists "sessions_set_updated_at" on "public"."sessions";

drop trigger if exists "sets_fill_denormalized" on "public"."sets";

drop trigger if exists "sets_recompute_is_pr" on "public"."sets";

drop policy "follows_delete_as_following_when_pending" on "public"."follows";

drop policy "profiles_select_public_or_owner_or_follower" on "public"."profiles";

drop policy "session_exercises_insert_own" on "public"."session_exercises";

drop policy "session_exercises_select_own_or_following" on "public"."session_exercises";

drop policy "sessions_select_own_or_following" on "public"."sessions";

drop policy "sets_insert_own" on "public"."sets";

drop policy "sets_select_own_or_following" on "public"."sets";

alter table "public"."exercises" drop constraint "exercises_created_by_fkey";

alter table "public"."follows" drop constraint "follows_follower_id_fkey";

alter table "public"."follows" drop constraint "follows_following_id_fkey";

alter table "public"."routine_exercises" drop constraint "routine_exercises_exercise_id_fkey";

alter table "public"."routine_exercises" drop constraint "routine_exercises_routine_id_fkey";

alter table "public"."routine_exercises" drop constraint "routine_exercises_user_id_fkey";

alter table "public"."routines" drop constraint "routines_user_id_fkey";

alter table "public"."session_exercises" drop constraint "session_exercises_exercise_id_fkey";

alter table "public"."session_exercises" drop constraint "session_exercises_session_id_fkey";

alter table "public"."session_exercises" drop constraint "session_exercises_user_id_fkey";

alter table "public"."sessions" drop constraint "sessions_routine_id_fkey";

alter table "public"."sessions" drop constraint "sessions_user_id_fkey";

alter table "public"."sets" drop constraint "sets_exercise_id_fkey";

alter table "public"."sets" drop constraint "sets_session_exercise_id_fkey";

alter table "public"."sets" drop constraint "sets_user_id_fkey";

drop index if exists "public"."idx_exercises_name_trgm";

drop index if exists "public"."idx_profiles_username_trgm";

drop index if exists "public"."idx_sessions_one_active_per_user";

alter table "public"."exercises" alter column "type" set default 'strength'::public.exercise_type;

alter table "public"."exercises" alter column "type" set data type public.exercise_type using "type"::text::public.exercise_type;

alter table "public"."follows" alter column "status" set default 'accepted'::public.follow_status;

alter table "public"."follows" alter column "status" set data type public.follow_status using "status"::text::public.follow_status;

alter table "public"."sessions" alter column "status" set default 'completed'::public.session_status;

alter table "public"."sessions" alter column "status" set data type public.session_status using "status"::text::public.session_status;

CREATE INDEX idx_exercises_name_trgm ON public.exercises USING gin (name public.gin_trgm_ops);

CREATE INDEX idx_profiles_username_trgm ON public.profiles USING gin (username public.gin_trgm_ops);

CREATE UNIQUE INDEX idx_sessions_one_active_per_user ON public.sessions USING btree (user_id) WHERE (status = 'active'::public.session_status);

alter table "public"."exercises" add constraint "exercises_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."exercises" validate constraint "exercises_created_by_fkey";

alter table "public"."follows" add constraint "follows_follower_id_fkey" FOREIGN KEY (follower_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."follows" validate constraint "follows_follower_id_fkey";

alter table "public"."follows" add constraint "follows_following_id_fkey" FOREIGN KEY (following_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."follows" validate constraint "follows_following_id_fkey";

alter table "public"."routine_exercises" add constraint "routine_exercises_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT not valid;

alter table "public"."routine_exercises" validate constraint "routine_exercises_exercise_id_fkey";

alter table "public"."routine_exercises" add constraint "routine_exercises_routine_id_fkey" FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE CASCADE not valid;

alter table "public"."routine_exercises" validate constraint "routine_exercises_routine_id_fkey";

alter table "public"."routine_exercises" add constraint "routine_exercises_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."routine_exercises" validate constraint "routine_exercises_user_id_fkey";

alter table "public"."routines" add constraint "routines_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."routines" validate constraint "routines_user_id_fkey";

alter table "public"."session_exercises" add constraint "session_exercises_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT not valid;

alter table "public"."session_exercises" validate constraint "session_exercises_exercise_id_fkey";

alter table "public"."session_exercises" add constraint "session_exercises_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE not valid;

alter table "public"."session_exercises" validate constraint "session_exercises_session_id_fkey";

alter table "public"."session_exercises" add constraint "session_exercises_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."session_exercises" validate constraint "session_exercises_user_id_fkey";

alter table "public"."sessions" add constraint "sessions_routine_id_fkey" FOREIGN KEY (routine_id) REFERENCES public.routines(id) ON DELETE SET NULL not valid;

alter table "public"."sessions" validate constraint "sessions_routine_id_fkey";

alter table "public"."sessions" add constraint "sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_user_id_fkey";

alter table "public"."sets" add constraint "sets_exercise_id_fkey" FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT not valid;

alter table "public"."sets" validate constraint "sets_exercise_id_fkey";

alter table "public"."sets" add constraint "sets_session_exercise_id_fkey" FOREIGN KEY (session_exercise_id) REFERENCES public.session_exercises(id) ON DELETE CASCADE not valid;

alter table "public"."sets" validate constraint "sets_session_exercise_id_fkey";

alter table "public"."sets" add constraint "sets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."sets" validate constraint "sets_user_id_fkey";


  create policy "follows_delete_as_following_when_pending"
  on "public"."follows"
  as permissive
  for delete
  to public
using (((( SELECT auth.uid() AS uid) = following_id) AND (status = 'pending'::public.follow_status)));



  create policy "profiles_select_public_or_owner_or_follower"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((is_public OR (id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.follows
  WHERE ((follows.follower_id = ( SELECT auth.uid() AS uid)) AND (follows.following_id = profiles.id) AND (follows.status = 'accepted'::public.follow_status))))));



  create policy "session_exercises_insert_own"
  on "public"."session_exercises"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = session_exercises.session_id) AND (sessions.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "session_exercises_select_own_or_following"
  on "public"."session_exercises"
  as permissive
  for select
  to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.follows
  WHERE ((follows.follower_id = ( SELECT auth.uid() AS uid)) AND (follows.following_id = session_exercises.user_id) AND (follows.status = 'accepted'::public.follow_status))))));



  create policy "sessions_select_own_or_following"
  on "public"."sessions"
  as permissive
  for select
  to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.follows
  WHERE ((follows.follower_id = ( SELECT auth.uid() AS uid)) AND (follows.following_id = sessions.user_id) AND (follows.status = 'accepted'::public.follow_status))))));



  create policy "sets_insert_own"
  on "public"."sets"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.session_exercises
  WHERE ((session_exercises.id = sets.session_exercise_id) AND (session_exercises.user_id = ( SELECT auth.uid() AS uid))))));



  create policy "sets_select_own_or_following"
  on "public"."sets"
  as permissive
  for select
  to public
using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM public.follows
  WHERE ((follows.follower_id = ( SELECT auth.uid() AS uid)) AND (follows.following_id = sets.user_id) AND (follows.status = 'accepted'::public.follow_status))))));


CREATE TRIGGER follows_set_status BEFORE INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION public.set_follow_status();

CREATE TRIGGER profiles_auto_accept_follows AFTER UPDATE OF is_public ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_accept_pending_on_public();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER routine_exercises_fill_user_id BEFORE INSERT ON public.routine_exercises FOR EACH ROW EXECUTE FUNCTION public.set_routine_exercise_user_id();

CREATE TRIGGER routines_set_updated_at BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER session_exercises_fill_user_id BEFORE INSERT ON public.session_exercises FOR EACH ROW EXECUTE FUNCTION public.set_session_exercise_user_id();

CREATE TRIGGER sessions_set_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.moddatetime('updated_at');

CREATE TRIGGER sets_fill_denormalized BEFORE INSERT ON public.sets FOR EACH ROW EXECUTE FUNCTION public.set_set_denormalized_fields();

CREATE TRIGGER sets_recompute_is_pr BEFORE INSERT ON public.sets FOR EACH ROW EXECUTE FUNCTION public.recompute_is_pr();

drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


