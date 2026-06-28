// ⚠️ 此文件已拆分为 client/server 两个独立文件，保留此文件仅为向后兼容
// 新代码请直接使用 @/lib/supabase/client 或 @/lib/supabase/server
export { createClient } from "@/lib/supabase/client";
export { createServerSupabaseClient, createAdminClient } from "@/lib/supabase/server";
