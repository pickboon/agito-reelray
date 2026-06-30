"use client";

import { useEditorStore } from "@/lib/editor/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  SlidersHorizontal,
  Film,
  Type,
  Music,
  ArrowLeftRight,
} from "lucide-react";
import type { TransitionType, TransitionConfig } from "@/lib/editor/types";
import { createDefaultTransform } from "@/lib/editor/types";
import { KeyframeEditor } from "../KeyframeEditor";

export function PropertiesPanel() {
  const {
    timeline,
    selectedClipIds,
    updateClip,
    deleteClips,
    updateSubtitle,
    deleteSubtitle,
    addSubtitle,
    playhead,
  } = useEditorStore();

  // 获取选中的第一个片段
  const selectedClips = timeline.clips.filter((c) => selectedClipIds.has(c.id));
  const clip = selectedClips[0] ?? null;
  const multiSelect = selectedClips.length > 1;

  // 获取当前位置的字幕
  const activeSub = timeline.subtitles.find(
    (s) => playhead >= s.startTime && playhead < s.startTime + s.duration
  );

  const handleTransitionChange = (
    direction: "in" | "out",
    type: TransitionType
  ) => {
    if (!clip) return;

    const config: TransitionConfig = { type, duration: 0.5 };
    if (direction === "in") {
      updateClip(clip.id, { transitionIn: config });
    } else {
      updateClip(clip.id, { transitionOut: config });
    }
  };

  const handleRemoveTransition = (direction: "in" | "out") => {
    if (!clip) return;
    if (direction === "in") {
      updateClip(clip.id, { transitionIn: undefined });
    } else {
      updateClip(clip.id, { transitionOut: undefined });
    }
  };

  if (!clip && !activeSub) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <SlidersHorizontal className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs text-center">选中片段后编辑属性</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-4 overflow-y-auto">
      {/* 片段属性 */}
      {clip && (
        <>
          <div>
            <h3 className="text-xs font-semibold text-brand-gold flex items-center gap-1.5 mb-3">
              <Film className="h-3.5 w-3.5" />
              片段属性
              {multiSelect && (
                <span className="text-muted-foreground font-normal">
                  ({selectedClips.length} 个)
                </span>
              )}
            </h3>

            <div className="space-y-3">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">来源</span>
                  <p className="text-foreground truncate">{clip.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">时长</span>
                  <p className="text-foreground">{clip.duration.toFixed(1)}s</p>
                </div>
                <div>
                  <span className="text-muted-foreground">截取起点</span>
                  <p className="text-foreground">{clip.trimStart.toFixed(1)}s</p>
                </div>
                <div>
                  <span className="text-muted-foreground">截取终点</span>
                  <p className="text-foreground">{clip.trimEnd.toFixed(1)}s</p>
                </div>
              </div>

              <Separator />

              {/* 音量 */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  音量
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={clip.volume}
                    onChange={(e) =>
                      updateClip(clip.id, { volume: parseFloat(e.target.value) })
                    }
                    className="flex-1 h-1 accent-brand-cyan"
                  />
                  <span className="text-[10px] text-muted-foreground w-8 text-right">
                    {Math.round(clip.volume * 100)}%
                  </span>
                </div>
              </div>

              <Separator />

              {/* 转场 */}
              <div className="space-y-2">
                <Label className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3" />
                  转场
                </Label>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-8">
                      入
                    </span>
                    <Select
                      value={clip.transitionIn?.type ?? "none"}
                      onValueChange={(v) =>
                        v === "none"
                          ? handleRemoveTransition("in")
                          : handleTransitionChange("in", v as TransitionType)
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="fade">淡入</SelectItem>
                        <SelectItem value="dissolve">溶解</SelectItem>
                        <SelectItem value="wipe-left">左擦</SelectItem>
                        <SelectItem value="wipe-right">右擦</SelectItem>
                      </SelectContent>
                    </Select>
                    {clip.transitionIn && (
                      <Input
                        type="number"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={clip.transitionIn.duration}
                        onChange={(e) =>
                          updateClip(clip.id, {
                            transitionIn: {
                              ...clip.transitionIn!,
                              duration: parseFloat(e.target.value) || 0.5,
                            },
                          })
                        }
                        className="h-7 w-16 text-[11px]"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-8">
                      出
                    </span>
                    <Select
                      value={clip.transitionOut?.type ?? "none"}
                      onValueChange={(v) =>
                        v === "none"
                          ? handleRemoveTransition("out")
                          : handleTransitionChange("out", v as TransitionType)
                      }
                    >
                      <SelectTrigger className="h-7 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">无</SelectItem>
                        <SelectItem value="fade">淡出</SelectItem>
                        <SelectItem value="dissolve">溶解</SelectItem>
                        <SelectItem value="wipe-left">左擦</SelectItem>
                        <SelectItem value="wipe-right">右擦</SelectItem>
                      </SelectContent>
                    </Select>
                    {clip.transitionOut && (
                      <Input
                        type="number"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={clip.transitionOut.duration}
                        onChange={(e) =>
                          updateClip(clip.id, {
                            transitionOut: {
                              ...clip.transitionOut!,
                              duration: parseFloat(e.target.value) || 0.5,
                            },
                          })
                        }
                        className="h-7 w-16 text-[11px]"
                      />
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* 关键帧动画 */}
              {clip.transform && (
                <div className="space-y-2">
                  <Label className="text-[11px] text-muted-foreground">
                    关键帧动画
                  </Label>
                  <KeyframeEditor clipId={clip.id} />
                </div>
              )}

              <Separator />

              {/* 操作按钮 */}
              <div className="flex gap-2">
                {clip.transform ? null : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] flex-1"
                    onClick={() => {
                      updateClip(clip.id, { transform: createDefaultTransform() });
                    }}
                  >
                    添加动画
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => deleteClips([...selectedClipIds])}
                >
                  删除
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 字幕属性 */}
      {activeSub && (
        <div>
          <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-3">
            <Type className="h-3.5 w-3.5 text-brand-gold" />
            字幕
          </h3>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground">文本</Label>
              <Input
                value={activeSub.text}
                onChange={(e) =>
                  updateSubtitle(activeSub.id, { text: e.target.value })
                }
                className="h-7 text-[11px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  起始
                </Label>
                <Input
                  type="number"
                  value={activeSub.startTime}
                  step="0.1"
                  onChange={(e) =>
                    updateSubtitle(activeSub.id, {
                      startTime: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="h-7 text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  时长
                </Label>
                <Input
                  type="number"
                  value={activeSub.duration}
                  step="0.1"
                  onChange={(e) =>
                    updateSubtitle(activeSub.id, {
                      duration: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="h-7 text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  字号
                </Label>
                <Input
                  type="number"
                  value={activeSub.style.fontSize}
                  min="12"
                  max="72"
                  onChange={(e) =>
                    updateSubtitle(activeSub.id, {
                      style: {
                        ...activeSub.style,
                        fontSize: parseInt(e.target.value) || 24,
                      },
                    })
                  }
                  className="h-7 text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  位置
                </Label>
                <Select
                  value={activeSub.style.position}
                  onValueChange={(v) =>
                    updateSubtitle(activeSub.id, {
                      style: {
                        ...activeSub.style,
                        position: v as "top" | "center" | "bottom",
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-7 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">顶部</SelectItem>
                    <SelectItem value="center">居中</SelectItem>
                    <SelectItem value="bottom">底部</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  字色
                </Label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={activeSub.style.color}
                    onChange={(e) =>
                      updateSubtitle(activeSub.id, {
                        style: { ...activeSub.style, color: e.target.value },
                      })
                    }
                    className="h-7 w-7 rounded border border-border cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {activeSub.style.color}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  背景
                </Label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={activeSub.style.backgroundColor.startsWith("rgba")
                      ? "#000000"
                      : activeSub.style.backgroundColor}
                    onChange={(e) =>
                      updateSubtitle(activeSub.id, {
                        style: {
                          ...activeSub.style,
                          backgroundColor: e.target.value + "99",
                        },
                      })
                    }
                    className="h-7 w-7 rounded border border-border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="h-7 text-[11px] w-full"
              onClick={() => deleteSubtitle(activeSub.id)}
            >
              删除字幕
            </Button>
          </div>
        </div>
      )}

      {/* 添加字幕按钮 */}
      <Separator />
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-[11px] w-full gap-1.5"
        onClick={() => addSubtitle("新字幕", playhead, 3)}
      >
        <Type className="h-3 w-3" />
        添加字幕
      </Button>
    </div>
  );
}
