"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch("/api/user/account-delete", { method: "POST" });
      if (!res.ok) throw new Error("Delete failed");
      const supabase = createClient();
      await supabase.auth.signOut();
      toast.success("账户已删除");
      router.push("/");
    } catch {
      toast.error("删除失败，请重试");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">账户设置</h1>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            删除账户
          </CardTitle>
          <CardDescription>永久删除您的账户和所有关联数据。此操作不可撤销。</CardDescription>
        </CardHeader>
        <CardContent>
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive font-medium">
                确定要永久删除您的账户吗？所有项目、视频、模板数据将被永久删除。
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  variant="destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? "删除中..." : "确认删除"}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                  disabled={deleting}
                >
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除我的账户
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
