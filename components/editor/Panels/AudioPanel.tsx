"use client";

import { useState, useRef } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Music, Upload, Trash2, Volume2, RefreshCw } from "lucide-react";
import type { AudioTrack } from "@/lib/editor/types";

export function AudioPanel() {
  const { timeline, addAudioTrack, updateAudioTrack, deleteAudioTrack } =
    useEditorStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // 上传到服务器
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "audio");

      const res = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        alert("上传失败");
        return;
      }

      const data = await res.json();

      // 创建音频轨道
      const track: AudioTrack = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.[^.]+$/, ""),
        url: data.url,
        startTime: 0,
        volume: 0.8,
        fadeIn: 1,
        fadeOut: 1,
        loop: false,
        duration: 0, // 需要后续获取
      };

      // 获取音频时长
      const audio = new Audio(data.url);
      audio.addEventListener("loadedmetadata", () => {
        addAudioTrack({ ...track, duration: audio.duration });
      });

      addAudioTrack(track);
    } catch {
      alert("上传失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-brand-purple flex items-center gap-1.5">
          <Music className="h-3.5 w-3.5" />
          音频轨道
        </h3>
      </div>

      {/* 上传按钮 */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[11px] w-full gap-1.5"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3 w-3" />
          {uploading ? "上传中..." : "上传音频"}
        </Button>
      </div>

      {/* 已有轨道 */}
      {timeline.audioTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
          <Music className="h-6 w-6 mb-1.5 opacity-30" />
          <p className="text-[10px] text-center">暂无音频轨道</p>
          <p className="text-[9px] text-center mt-0.5">
            上传 mp3/wav 文件添加背景音乐
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.audioTracks.map((track) => (
            <div
              key={track.id}
              className="p-2 rounded-md border border-border/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-foreground truncate flex-1">
                  {track.name}
                </span>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() =>
                      updateAudioTrack(track.id, { loop: !track.loop })
                    }
                    title={track.loop ? "关闭循环" : "开启循环"}
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${
                        track.loop ? "text-brand-gold" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => deleteAudioTrack(track.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* 音量 */}
              <div className="flex items-center gap-2">
                <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={track.volume}
                  onChange={(e) =>
                    updateAudioTrack(track.id, {
                      volume: parseFloat(e.target.value),
                    })
                  }
                  className="flex-1 h-1 accent-brand-gold"
                />
                <span className="text-[9px] text-muted-foreground w-7 text-right">
                  {Math.round(track.volume * 100)}%
                </span>
              </div>

              {/* 淡入淡出 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[9px] text-muted-foreground">
                    淡入
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={track.fadeIn}
                    onChange={(e) =>
                      updateAudioTrack(track.id, {
                        fadeIn: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-6 text-[10px] px-1.5"
                  />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[9px] text-muted-foreground">
                    淡出
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="5"
                    step="0.5"
                    value={track.fadeOut}
                    onChange={(e) =>
                      updateAudioTrack(track.id, {
                        fadeOut: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="h-6 text-[10px] px-1.5"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
