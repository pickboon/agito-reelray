"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Film, Clock } from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  template: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("projects")
        .select("id, title, status, template, updated_at")
        .order("updated_at", { ascending: false });

      if (err) {
        setError("加载项目失败");
      } else {
        setProjects((data ?? []) as Project[]);
      }
      setLoading(false);
    }
    fetchProjects();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">管理你的短剧项目</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-destructive">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Film className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-foreground font-medium">还没有项目</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              创建你的第一个短剧项目
            </p>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
            >
              <Card className="h-full hover:border-brand-gold/30 transition-colors cursor-pointer">
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-brand-gold" />
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">
                        {project.title}
                      </h3>
                    </div>
                    <Badge
                      variant={
                        project.status === "active" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  {project.template && (
                    <Badge variant="outline" className="text-xs">
                      {project.template}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(project.updated_at).toLocaleDateString("zh-CN")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
