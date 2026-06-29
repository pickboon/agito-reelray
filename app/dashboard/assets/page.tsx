"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Trash2,
  Video,
  Image as ImageIcon,
  Clock,
  Filter,
} from "lucide-react";

interface Asset {
  id: string;
  type: "video" | "image";
  source: "ai_generated" | "uploaded";
  title: string;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  size_bytes?: number;
  created_at: string;
  model_id?: string;
}

export default function AssetsPage() {
  const supabase = createClient();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<"all" | "ai_generated" | "uploaded">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "video" | "image">("all");

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    setLoading(true);
    try {
      // Fetch generated videos
      const { data: tasks, error } = await supabase
        .from("generation_tasks")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch tasks:", error);
        return;
      }

      const videoAssets: Asset[] = (tasks ?? []).map((task) => ({
        id: task.id,
        type: "video" as const,
        source: "ai_generated" as const,
        title: task.prompt.slice(0, 50) + (task.prompt.length > 50 ? "..." : ""),
        url: task.video_url,
        thumbnail_url: task.thumbnail_url,
        duration: task.duration,
        created_at: task.created_at,
        model_id: task.model_id,
      }));

      setAssets(videoAssets);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(asset: Asset) {
    const a = document.createElement("a");
    a.href = asset.url;
    a.download = `${asset.type}-${asset.id}.mp4`;
    a.click();
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "";
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredAssets = assets.filter((asset) => {
    if (sourceFilter !== "all" && asset.source !== sourceFilter) return false;
    if (typeFilter !== "all" && asset.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">我的资产</h1>
          <p className="text-sm text-muted-foreground mt-1">管理你生成和上传的媒体文件</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={sourceFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("all")}
          >
            全部
          </Button>
          <Button
            variant={sourceFilter === "ai_generated" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("ai_generated")}
          >
            AI 生成
          </Button>
          <Button
            variant={sourceFilter === "uploaded" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("uploaded")}
          >
            上传
          </Button>
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-32">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="video">视频</SelectItem>
            <SelectItem value="image">图片</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assets Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Video className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-foreground font-medium">暂无资产</p>
            <p className="text-sm text-muted-foreground mt-1">
              生成视频后会自动显示在这里
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden group cursor-pointer">
              <div className="aspect-video bg-muted relative">
                {asset.thumbnail_url ? (
                  <img
                    src={asset.thumbnail_url}
                    alt={asset.title}
                    className="w-full h-full object-cover"
                  />
                ) : asset.type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleDownload(asset)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Duration badge */}
                {asset.duration && (
                  <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                    {asset.duration}s
                  </Badge>
                )}
              </div>

              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-medium line-clamp-2">{asset.title}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(asset.created_at)}</span>
                  </div>
                  {asset.model_id && (
                    <Badge variant="outline" className="text-xs">
                      {asset.model_id}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
