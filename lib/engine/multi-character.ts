import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase";
import { uploadFile, generateR2Key } from "@/lib/r2";

const TILE_WIDTH = 512;
const TILE_HEIGHT = 512;

export interface MergeResult {
  mergedImageUrl: string;
  r2Key: string;
}

/**
 * 合并多个角色的锚点图为一张水平排列的合成图
 * 每个角色等宽（512px），总宽度 = n * 512px，高度 = 512px
 * 透明背景，每个角色居中
 */
export async function mergeAnchors(characterIds: string[]): Promise<MergeResult> {
  if (characterIds.length === 0) {
    throw new Error("至少需要一个角色 ID");
  }

  const admin = createAdminClient();

  // 获取每个角色的 anchor_image_url
  const { data: characters, error } = await admin
    .from("characters")
    .select("id, anchor_image_url")
    .in("id", characterIds);

  if (error) {
    throw new Error(`查询角色失败: ${error.message}`);
  }

  const validChars = characters?.filter((c: { anchor_image_url: string | null }) => c.anchor_image_url) ?? [];
  if (validChars.length === 0) {
    throw new Error("所选角色均没有锚点图");
  }

  // 下载每个锚点图到 Buffer
  const images: Buffer[] = [];
  for (const char of validChars) {
    const resp = await fetch(char.anchor_image_url as string);
    if (!resp.ok) {
      throw new Error(`下载锚点图失败: ${char.anchor_image_url}`);
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    images.push(buf);
  }

  // 合成：水平排列
  const totalWidth = images.length * TILE_WIDTH;
  const compositeImages = await Promise.all(
    images.map(async (buf, i) => {
      const resized = await sharp(buf)
        .resize(TILE_WIDTH, TILE_HEIGHT, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      return {
        input: resized,
        left: i * TILE_WIDTH,
        top: 0,
      };
    })
  );

  // 创建透明背景并合成
  const merged = await sharp({
    create: {
      width: totalWidth,
      height: TILE_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeImages)
    .png()
    .toBuffer();

  // 上传到 R2
  const r2Key = generateR2Key(
    "merged-anchors",
    `${characterIds.join("_")}_${Date.now()}.png`
  );
  const mergedImageUrl = await uploadFile(r2Key, merged, "image/png");

  return { mergedImageUrl, r2Key };
}
