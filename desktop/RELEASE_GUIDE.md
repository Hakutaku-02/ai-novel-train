# 桌面版发布指南

## 发布流程

### 1. 更新版本号

修改以下文件中的版本号：
- `/desktop/package.json` - `version` 字段
- `/package.json` - `version` 字段（根目录）

⚠️ 注意：`/desktop/package.json` 中的 `version` 字段必须使用标准 semver（例如 `1.0.5-alpha`），不要包含 leading `v` 前缀，否则会导致生成的 `latest.yml` 与发布的文件名不匹配，进而导致自动更新下载失败。

### 2. 更新 CHANGELOG

在 `/CHANGELOG.md` 中添加新版本的更新说明。

### 3. 提交代码并创建标签

```bash
cd /Users/xiongxin/projects/ai-novel-trainer1

# 提交所有变更
git add -A
git commit -m "release: vX.X.X-alpha"

# 创建标签
git tag -a vX.X.X-alpha -m "Release vX.X.X-alpha"

# 推送代码和标签
git push origin main
git push origin vX.X.X-alpha
```

### 4. 打包所有平台安装包

```bash
cd desktop

# 打包 macOS 版本
npm run build:mac

# 打包 Windows 版本
npm run build:win

# 或者同时打包所有平台
npm run build:all
```

### 5. 创建 GitHub Release 并上传安装包

⚠️ **重要：必须上传以下所有文件，否则自动更新功能会报错！**

#### 必须上传的文件清单：

| 文件 | 说明 | 用途 |
|------|------|------|
| `latest-mac.yml` | macOS 更新元数据 | **自动更新必需** |
| `latest.yml` | Windows 更新元数据 | **自动更新必需** |
| `AI网文训练师-X.X.X-alpha-arm64-mac.zip` | ARM64 Mac 更新包 | **自动更新必需** |
| `AI网文训练师-X.X.X-alpha-mac.zip` | Intel Mac 更新包 | **自动更新必需** |
| `AI网文训练师-X.X.X-alpha-arm64.dmg` | ARM64 Mac 安装包 | 用户下载 |
| `AI网文训练师-X.X.X-alpha.dmg` | Intel Mac 安装包 | 用户下载 |
| `AI网文训练师 Setup X.X.X-alpha.exe` | Windows 安装程序 | 用户下载 |
| `AI网文训练师 X.X.X-alpha.exe` | Windows 便携版 | 用户下载（可选） |

#### 发布命令示例：

```bash
cd /Users/xiongxin/projects/ai-novel-trainer1

# 创建 Release 并上传所有文件
gh release create vX.X.X-alpha \
  --title "vX.X.X-alpha" \
  --notes-file RELEASE_NOTES.md \
  --prerelease \
  "desktop/dist/latest-mac.yml" \
  "desktop/dist/latest.yml" \
  "desktop/dist/AI网文训练师-X.X.X-alpha-arm64-mac.zip" \
  "desktop/dist/AI网文训练师-X.X.X-alpha-mac.zip" \
  "desktop/dist/AI网文训练师-X.X.X-alpha-arm64.dmg" \
  "desktop/dist/AI网文训练师-X.X.X-alpha.dmg" \
  "desktop/dist/AI网文训练师 Setup X.X.X-alpha.exe" \
  "desktop/dist/AI网文训练师 X.X.X-alpha.exe"
```

## ⚠️ 常见问题

### 1. 自动更新报错 404 找不到 latest-mac.yml

**原因**：发布时忘记上传 `latest-mac.yml` 和 `latest.yml` 文件。

**解决**：
```bash
# 补充上传更新元数据文件
gh release upload vX.X.X-alpha \
  "desktop/dist/latest-mac.yml" \
  "desktop/dist/latest.yml"
```

### 2. 自动更新下载失败

**原因**：`latest-mac.yml` 中引用的 ZIP 文件没有上传。

**解决**：确保上传了对应的 `.zip` 文件：
```bash
gh release upload vX.X.X-alpha \
  "desktop/dist/AI网文训练师-X.X.X-alpha-arm64-mac.zip" \
  "desktop/dist/AI网文训练师-X.X.X-alpha-mac.zip"
```

### 3. yml 文件中的文件名与实际不匹配

**原因**：electron-builder 生成的 yml 文件中的文件名可能与 `productName` 配置不一致。

**解决**：检查 `desktop/dist/latest-mac.yml` 中的 `url` 字段，确保与实际上传的文件名完全一致。如果不一致，需要手动修改 yml 文件后重新上传。

## 发布检查清单

发布前请确认：

- [ ] 版本号已更新
- [ ] CHANGELOG 已更新
- [ ] 代码已提交并推送
- [ ] Git 标签已创建并推送
- [ ] macOS DMG 文件已上传（arm64 + x64）
- [ ] macOS ZIP 文件已上传（arm64 + x64）- **自动更新必需**
- [ ] Windows EXE 文件已上传
- [ ] `latest-mac.yml` 已上传 - **自动更新必需**
- [ ] `latest.yml` 已上传 - **自动更新必需**
- [ ] 验证自动更新功能正常工作
