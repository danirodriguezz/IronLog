import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActivityFeed } from "@/app/(app)/profile/_components/activity-feed";
import { ProfileHeader } from "./_components/profile-header";
import { FollowButton } from "./_components/follow-button";
import { PrivateGate } from "./_components/private-gate";

type HeaderRow = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
  followers_count: number;
  following_count: number;
};

type FollowStatus = "none" | "pending" | "accepted";

const UserProfilePage = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<React.ReactElement> => {
  const { username } = await params;
  const normalized = username.toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: headerRows, error: headerErr } = await supabase.rpc("get_profile_header", {
    u: normalized,
  });
  if (headerErr) {
    console.error("get_profile_header error:", headerErr);
    notFound();
  }

  const header = (headerRows?.[0] ?? null) as HeaderRow | null;
  if (!header) notFound();

  if (header.id === user.id) redirect("/profile");

  const { data: followRow } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", user.id)
    .eq("following_id", header.id)
    .maybeSingle();

  const followStatus: FollowStatus = followRow
    ? (followRow.status as "pending" | "accepted")
    : "none";

  const canSeeContent = header.is_public || followStatus === "accepted";

  let bio: { goal: string | null; age: number | null; weight_kg: number | null } | null = null;
  if (canSeeContent) {
    const { data } = await supabase
      .from("profiles")
      .select("goal, age, weight_kg")
      .eq("id", header.id)
      .maybeSingle();
    bio = data ?? null;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <ProfileHeader
        username={header.username}
        fullName={header.full_name}
        avatarUrl={header.avatar_url}
        isPublic={header.is_public}
        followersCount={header.followers_count}
        followingCount={header.following_count}
        goal={bio?.goal ?? null}
        age={bio?.age ?? null}
        weightKg={bio?.weight_kg ?? null}
        showBio={canSeeContent}
        trailing={
          <FollowButton
            targetId={header.id}
            targetUsername={header.username}
            isPublicProfile={header.is_public}
            initialStatus={followStatus}
          />
        }
      />

      {canSeeContent ? (
        <ActivityFeed userId={header.id} disableLinks />
      ) : (
        <PrivateGate status={followStatus} />
      )}
    </main>
  );
};

export default UserProfilePage;
