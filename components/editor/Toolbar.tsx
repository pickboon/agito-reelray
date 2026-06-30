"use client";

import Link from "next/link";
import { useEditorStore } from "@/lib/editor/store";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Save,
  Download,
  ZoomIn,
  ZoomOut,
  FolderOpen,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { formatTime } from "@/lib/editor/time";

export function Toolbar() {
  const {
    episodeId,
    projectName,
    timeline,
    playhead,
    isPlaying,
    isDirty,
    setDirty,
    setZoom,
    setIsPlaying,
  } = useEditorStore();

  const temporalState = useStore(useEditorStore.temporal);
  const undo = temporalState?.undo;
  const redo = temporalState?.redo;
  const canUndo = (temporalState?.pastStates?.length ?? 0) > 0;
  const canRedo = (temporalState?.futureStates?.length ?? 0) > 0;

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleSave = async () => {
    if (!episodeId) return;
    setSaving(true);
    try {
      const timeline = useEditorStore.getState().timeline;
      const state = JSON.parse(JSON.stringify(timeline));

      const res = await fetch("/api/editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, state }),
      });

      if (res.ok) {
        setDirty(false);
      } else {
        alert("保存失败");
      }
    } catch {
      alert("保存请求失败");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const timeline = useEditorStore.getState().timeline;
      const res = await fetch("/api/editor/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeId, timeline }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "导出失败");
      } else {
        alert("导出任务已提交，请稍后在下载中心查看");
      }
    } catch {
      alert("导出请求失败");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-[#0d0d1a] px-4">
      {/* 左侧：返回 + 项目名 */}
      <div className="flex items-center gap-3">
        <Link
          href={
            episodeId
              ? `/dashboard/projects`
              : "/dashboard"
          }
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </Link>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm font-medium text-foreground truncate max-w-48">
          {projectName || "编辑器"}
        </span>
        {isDirty && (
          <span className="text-[10px] text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded">
            未保存
          </span>
        )}
      </div>

      {/* 中间：播放控制 + 时间 */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-20 text-right">
          {formatTime(playhead)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <div className="flex gap-0.5">
              <div className="w-1 h-3 bg-foreground rounded-sm" />
              <div className="w-1 h-3 bg-foreground rounded-sm" />
            </div>
          ) : (
            <svg viewBox="0 0 12 14" className="h-3.5 w-3.5 fill-foreground">
              <path d="M1 1l10 6-10 6V1z" />
            </svg>
          )}
        </Button>
        <span className="text-xs font-mono text-muted-foreground w-20">
          {formatTime(timeline.totalDuration)}
        </span>
      </div>

      {/* 右侧：操作按钮 */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canUndo}
          onClick={() => undo?.(1)}
          title="撤销 (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canRedo}
          onClick={() => redo?.(1)}
          title="重做 (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => useEditorStore.getState().toggleAssetsPanel()}
          title="素材面板"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => useEditorStore.getState().togglePropertiesPanel()}
          title="属性面板"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(timeline.zoom - 10)}
          title="缩小"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground w-8 text-center">
          {Math.round((timeline.zoom / 200) * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setZoom(timeline.zoom + 10)}
          title="放大"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          保存
        </Button>
        <Button
          size="sm"
          className={`h-8 gap-1.5 text-xs ${exporting ? 'editor-export-progress text-background' : 'bg-brand-gold text-background hover:bg-brand-gold/90'}`}
          disabled={exporting || timeline.clips.length === 0}
          onClick={handleExport}
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          导出
        </Button>
      </div>
    </div>
  );
}
