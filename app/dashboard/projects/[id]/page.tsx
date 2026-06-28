"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, Film, ArrowLeft } from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  template_id?: string;
  description: string;
  created_at: string;
}

interface Character {
  id: string;
  name: string;
  role?: string;
  description: string;
  reference_image_url: string | null;
}

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  status: string;
  created_at: string;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [projectRes, charsRes, epsRes] = await Promise.all([
        supabase.from("projects").select("*").eq("id", id).single(),
        supabase.from("characters").select("*").eq("project_id", id),
        supabase
          .from("episodes")
          .select("*")
          .eq("project_id", id)
          .order("episode_number", { ascending: true }),
      ]);

      if (projectRes.error) {
        setError("加载项目失败");
        setLoading(false);
        return;
      }

      setProject(projectRes.data as Project);
      setCharacters((charsRes.data ?? []) as Character[]);
      setEpisodes((epsRes.data ?? []) as Episode[]);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error ?? "项目不存在"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回项目列表
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground">
            {project.title}
          </h1>
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
          >
            {project.status}
          </Badge>
          {project.template_id && (
            <Badge variant="outline">{project.template_id}</Badge>
          )}
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {project.description}
          </p>
        )}
      </div>

      {/* 角色区域 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-cyan" />
            Characters
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Character
          </Button>
        </div>
        {characters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">暂无角色</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((char) => (
              <Card key={char.id}>
                <CardContent className="flex items-start gap-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10">
                    <Users className="h-5 w-5 text-brand-cyan" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {char.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{char.role}</p>
                    {char.description && (
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                        {char.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* 集列表区域 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Film className="h-4 w-4 text-brand-gold" />
            Episodes
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Episode
          </Button>
        </div>
        {episodes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Film className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">暂无集</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                href={`/dashboard/projects/${id}/episodes/${ep.id}`}
              >
                <Card className="hover:border-brand-gold/30 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-gold/10 text-xs font-medium text-brand-gold">
                        {ep.episode_number}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {ep.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ep.created_at).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        ep.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {ep.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
