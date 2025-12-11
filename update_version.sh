#!/bin/zsh

# 更新版本号的脚本
# 将版本从 1.0.4-alpha 更新到 1.0.5-alpha

echo "开始更新版本号到 v1.0.5-alpha..."

# 更新根目录 package.json
echo "更新根目录 package.json..."
sed -i '' 's/"version": "1.0.4-alpha"/"version": "1.0.5-alpha"/g' package.json

# 更新 desktop/package.json
echo "更新 desktop/package.json..."
sed -i '' 's/"version": "v1.0.4-alpha"/"version": "v1.0.5-alpha"/g' desktop/package.json

# 更新 Android build.gradle
echo "更新 Android build.gradle..."
sed -i '' 's/versionName "1.0"/versionName "1.0.5-alpha"/g' client/android/app/build.gradle

echo "版本更新完成！"