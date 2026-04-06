#!/bin/bash
# Simple BIND9 Panel 构建脚本

set -e

echo "=== Simple BIND9 Panel Build Script ==="

# 检查 Go
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed"
    exit 1
fi

echo "Go version: $(go version)"

# 进入后端目录
cd "$(dirname "$0")/backend"

# 确保前端文件已复制到 backend/frontend/dist
if [ ! -d "frontend/dist" ]; then
    echo "复制前端文件到 embedded 目录..."
    mkdir -p frontend/dist
    cp -r ../frontend/dist/* frontend/dist/
fi

# 清理旧构建
rm -f server

# 构建
echo "构建后端..."
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server .

echo ""
echo "构建完成: backend/server"
echo "大小: $(du -h server | cut -f1)"
echo ""
echo "在 VM 上部署时:"
echo "1. 确保已安装 BIND9: apt install bind9 bind9utils"
echo "2. 将 backend/server 复制到 /usr/local/bin/"
echo "3. 配置 /etc/bind/named.conf.local 和区域文件"
echo "4. 运行 ./server 启动面板"
