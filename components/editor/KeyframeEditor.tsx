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
import type { Keyframe, EasingType, ClipTransform } from "@/lib/editor/types";
import { Plus, Minus } from "lucide-react";

interface KeyframeEditorProps {
  clipId: string;
}

type TransformProperty = "scale" | "panX" | "panY";

const PROPERTY_LABELS: Record<TransformProperty, string> = {
  scale: "缩放",
  panX: "水平平移",
  panY: "垂直平移",
};

const PROPERTY_RANGES: Record<TransformProperty, { min: number; max: number; step: number }> = {
  scale: { min: 0.5, max: 3, step: 0.05 },
  panX: { min: -100, max: 100, step: 1 },
  panY: { min: -100, max: 100, step: 1 },
};

export function KeyframeEditor({ clipId }: KeyframeEditorProps) {
  const { timeline, updateClip } = useEditorStore();

  const clip = timeline.clips.find((c) => c.id === clipId);
  if (!clip || !clip.transform) return null;

  const transform = clip.transform;

  const updateKeyframes = (
    property: TransformProperty,
    keyframes: Keyframe[]
  ) => {
    const newTransform: ClipTransform = {
      ...transform,
      [property]: keyframes,
    };
    updateClip(clipId, { transform: newTransform });
  };

  const addKeyframe = (property: TransformProperty) => {
    const current = transform[property];
    const lastKf = current[current.length - 1];
    const newTime = lastKf ? lastKf.time + 1 : 0;
    const newValue = lastKf ? lastKf.value : (property === "scale" ? 1 : 0);

    updateKeyframes(property, [
      ...current,
      { time: newTime, value: newValue, easing: "linear" },
    ]);
  };

  const removeKeyframe = (property: TransformProperty, index: number) => {
    const current = transform[property];
    if (current.length <= 1) return;

    updateKeyframes(
      property,
      current.filter((_, i) => i !== index)
    );
  };

  const updateKeyframeValue = (
    property: TransformProperty,
    index: number,
    value: number
  ) => {
    const current = [...transform[property]];
    current[index] = { ...current[index], value };
    updateKeyframes(property, current);
  };

  const updateKeyframeTime = (
    property: TransformProperty,
    index: number,
    time: number
  ) => {
    const current = [...transform[property]];
    current[index] = { ...current[index], time: Math.max(0, time) };
    // 按时间排序
    current.sort((a, b) => a.time - b.time);
    updateKeyframes(property, current);
  };

  const updateKeyframeEasing = (
    property: TransformProperty,
    index: number,
    easing: EasingType
  ) => {
    const current = [...transform[property]];
    current[index] = { ...current[index], easing };
    updateKeyframes(property, current);
  };

  return (
    <div className="space-y-3">
      {(["scale", "panX", "panY"] as TransformProperty[]).map((prop) => {
        const keyframes = transform[prop];
        const range = PROPERTY_RANGES[prop];

        return (
          <div key={prop} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] text-muted-foreground">
                {PROPERTY_LABELS[prop]}
              </Label>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => addKeyframe(prop)}
                title="添加关键帧"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-1">
              {keyframes.map((kf, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  {/* 时间 */}
                  <Input
                    type="number"
                    value={kf.time}
                    step="0.1"
                    min="0"
                    onChange={(e) =>
                      updateKeyframeTime(prop, idx, parseFloat(e.target.value) || 0)
                    }
                    className="h-6 w-14 text-[10px] px-1.5"
                  />

                  {/* 值 */}
                  <input
                    type="range"
                    min={range.min}
                    max={range.max}
                    step={range.step}
                    value={kf.value}
                    onChange={(e) =>
                      updateKeyframeValue(prop, idx, parseFloat(e.target.value))
                    }
                    className="flex-1 h-1 accent-brand-cyan"
                  />
                  <span className="text-[9px] text-muted-foreground w-8 text-right">
                    {kf.value.toFixed(prop === "scale" ? 2 : 0)}
                  </span>

                  {/* 缓动 */}
                  <Select
                    value={kf.easing}
                    onValueChange={(v) =>
                      updateKeyframeEasing(prop, idx, v as EasingType)
                    }
                  >
                    <SelectTrigger className="h-6 w-16 text-[9px] px-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">线性</SelectItem>
                      <SelectItem value="ease-in">缓入</SelectItem>
                      <SelectItem value="ease-out">缓出</SelectItem>
                      <SelectItem value="ease-in-out">缓入缓出</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 删除 */}
                  {keyframes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => removeKeyframe(prop, idx)}
                    >
                      <Minus className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
