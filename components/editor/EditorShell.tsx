"use client";

import { useEffect, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { Toolbar } from "./Toolbar";
import { PreviewPlayer } from "./PreviewPlayer";
import { TimelineRuler } from "./Timeline/TimelineRuler";
import { TimelineTrack } from "./Timeline/TimelineTrack";
import { Playhead } from "./Timeline/Playhead";
import { AssetPanel } from "./Panels/AssetPanel";
import { AudioPanel } from "./Panels/AudioPanel";
import { PropertiesPanel } from "./Panels/PropertiesPanel";

export function EditorShell() {
  const {
    timeline,
    panels,
    toggleAssetsPanel,
    togglePropertiesPanel,
    setPlayhead,
    selectedClipIds,
    clearSelection,
    deleteClips,
    copySelection,
    pasteAtPlayhead,
    splitClipAtPlayhead,
    selectAll,
    setIsPlaying,
    isPlaying,
  } = useEditorStore();

  // 撤销/重做 — accessed via callbacks, not reactive state

  // 键盘快捷键
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 忽略输入框内的快捷键
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const ctrl = e.metaKey || e.ctrlKey;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        if (selectedClipIds.size > 0) {
          deleteClips([...selectedClipIds]);
        }
      } else if (ctrl && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) useEditorStore.temporal?.getState()?.redo?.(1);
        else useEditorStore.temporal?.getState()?.undo?.(1);
      } else if (ctrl && e.key === "c") {
        e.preventDefault();
        copySelection();
      } else if (ctrl && e.key === "v") {
        e.preventDefault();
        pasteAtPlayhead();
      } else if (ctrl && e.key === "a") {
        e.preventDefault();
        selectAll();
      } else if (e.key === "s" && !ctrl) {
        e.preventDefault();
        splitClipAtPlayhead();
      }
    },
    [
      isPlaying,
      selectedClipIds,
      setIsPlaying,
      deleteClips,
      copySelection,
      pasteAtPlayhead,
      selectAll,
      splitClipAtPlayhead,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const videoTracks = timeline.tracks.filter((t) => t.type === "video");

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 主体区域 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧素材面板 */}
        {panels.assetsOpen && (
          <div className="w-64 shrink-0 border-r border-border overflow-y-auto">
            <AssetPanel />
            <div className="border-t border-border/50 mt-2" />
            <AudioPanel />
          </div>
        )}

        {/* 中央预览区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-[#0a0a12]">
            <PreviewPlayer />
          </div>
        </div>

        {/* 右侧属性面板 */}
        {panels.propertiesOpen && (
          <div className="w-72 shrink-0 border-l border-border overflow-y-auto">
            <PropertiesPanel />
          </div>
        )}
      </div>

      {/* 底部时间轴区域 */}
      <div className="h-64 shrink-0 border-t border-border bg-[#0d0d1a] flex flex-col">
        {/* 刻度尺 */}
        <div className="h-8 shrink-0 relative border-b border-border/50">
          <TimelineRuler />
          <Playhead />
        </div>

        {/* 轨道区域 */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden relative"
          onClick={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
        >
          {videoTracks.map((track) => (
            <TimelineTrack key={track.id} track={track} />
          ))}

          {/* 添加轨道按钮 */}
          <div className="px-3 py-2">
            <button
              onClick={() => useEditorStore.getState().addTrack("video")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border/50 hover:border-border"
            >
              + 添加轨道
            </button>
          </div>

          <Playhead isOverlay />
        </div>
      </div>
    </div>
  );
}
