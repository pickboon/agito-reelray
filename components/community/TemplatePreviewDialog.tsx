"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// 各 preset 的风格标签
const PRESET_TAGS: Record<string, string[]> = {
  revenge:  ["都市", "复仇", "爽剧", "高燃"],
  romance:  ["甜宠", "虐恋", "情感", "暖调"],
  thriller: ["悬疑", "烧脑", "推理", "暗黑"],
  fantasy:  ["仙侠", "奇幻", "修仙", "古风"],
};

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateName: string;
  templateDesc: string;
  templateEmoji: string;
  presetKey: string;
  onApply: () => void;
  loading?: boolean;
}

export function TemplatePreviewDialog({
  open,
  onOpenChange,
  templateName,
  templateDesc,
  templateEmoji,
  presetKey,
  onApply,
  loading = false,
}: TemplatePreviewDialogProps) {
  const tags = PRESET_TAGS[presetKey] ?? ["通用", "短片"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{templateEmoji}</span>
            <div>
              <DialogTitle>{templateName}</DialogTitle>
              <DialogDescription className="mt-0.5">{templateDesc}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 风格标签 */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
            >
              {tag}
            </span>
          ))}
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <button
            className="btn-primary inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={onApply}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              <>⚡️ 使用该模板创建新短剧</>
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
