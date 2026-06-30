import { redirect } from "next/navigation";

// P2-3: Shot 独立详情页重定向到集页面 + ShotDrawer
// 通过 query param ?shot={shotId} 让集页面自动打开 ShotDrawer
export default async function ShotDetailRedirect({
  params,
}: {
  params: Promise<{ id: string; ep: string; shot: string }>;
}) {
  const { id, ep, shot } = await params;
  redirect(`/dashboard/projects/${id}/episodes/${ep}?shot=${shot}`);
}
