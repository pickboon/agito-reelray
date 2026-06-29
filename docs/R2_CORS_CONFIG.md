# R2 CORS 配置指南

## 背景

视频生成服务（HappyHorse）上传视频到 Cloudflare R2 时，需要配置 CORS 规则以允许浏览器访问。

## 配置步骤

1. 登录 Cloudflare Dashboard
2. 进入 R2 存储桶设置
3. 找到 CORS 配置部分
4. 添加以下 CORS 规则：

```json
[
  {
    "allowed_origins": [
      "https://reelray.agitoai.com",
      "http://localhost:3000"
    ],
    "allowed_methods": [
      "GET",
      "PUT",
      "POST",
      "HEAD"
    ],
    "allowed_headers": [
      "Content-Type",
      "Authorization",
      "x-amz-date",
      "x-amz-content-sha256"
    ],
    "expose_headers": [
      "ETag"
    ],
    "max_age_seconds": 3600
  }
]
```

## 说明

- `allowed_origins`: 允许访问 R2 的域名（生产环境 + 本地开发）
- `allowed_methods`: 允许的 HTTP 方法
- `allowed_headers`: 允许请求头
- `expose_headers`: 暴露给客户端的响应头
- `max_age_seconds`: 预检请求缓存时间（1 小时）

## 验证

配置完成后，可以通过以下方式验证：

```bash
curl -H "Origin: https://reelray.agitoai.com" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://<your-r2-bucket>.r2.cloudflarestorage.com/test.mp4 \
     -v
```

应返回包含 `Access-Control-Allow-Origin` 的响应头。
