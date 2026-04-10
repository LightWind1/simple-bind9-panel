#!/bin/bash
# Simple BIND9 Panel 卸载脚本 (Debian/Ubuntu)
set -e

APP_NAME="bind9-panel"
APP_DIR="/opt/${APP_NAME}"
DATA_DIR="/var/lib/${APP_NAME}"
CONFIG_DIR="/etc/${APP_NAME}"
LOG_DIR="/var/log/${APP_NAME}"
BINARY_PATH="/usr/local/bin/${APP_NAME}"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================"
echo "  Simple BIND9 Panel 卸载脚本"
echo "============================================"
echo ""

# 检查是否为 root
if [[ $EUID -ne 0 ]]; then
   log_err "请使用 sudo 运行此脚本"
fi

log_info "开始卸载 Simple BIND9 Panel..."

# 1. 停止并禁用服务
log_info "停止服务..."
if systemctl is-active --quiet ${APP_NAME}.service 2>/dev/null; then
    systemctl stop ${APP_NAME}.service
    log_info "服务已停止"
fi

if systemctl is-enabled --quiet ${APP_NAME}.service 2>/dev/null; then
    systemctl disable ${APP_NAME}.service
    log_info "服务已禁用"
fi

# 2. 删除 systemd 服务文件
if [[ -f "${SERVICE_FILE}" ]]; then
    rm -f "${SERVICE_FILE}"
    systemctl daemon-reload
    log_info "systemd 服务已删除"
fi

# 3. 删除二进制文件
if [[ -f "${BINARY_PATH}" ]]; then
    rm -f "${BINARY_PATH}"
    log_info "二进制文件已删除"
fi

# 4. 删除应用目录
if [[ -d "${APP_DIR}" ]]; then
    rm -rf "${APP_DIR}"
    log_info "应用目录已删除"
fi

# 5. 删除数据目录
if [[ -d "${DATA_DIR}" ]]; then
    log_warn "数据目录存在: ${DATA_DIR}"
    log_warn "是否删除数据目录? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf "${DATA_DIR}"
        log_info "数据目录已删除"
    else
        log_info "保留数据目录"
    fi
fi

# 6. 删除配置目录
if [[ -d "${CONFIG_DIR}" ]]; then
    log_warn "是否删除配置目录? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        rm -rf "${CONFIG_DIR}"
        log_info "配置目录已删除"
    else
        log_info "保留配置目录"
    fi
fi

# 7. 删除日志目录
if [[ -d "${LOG_DIR}" ]]; then
    rm -rf "${LOG_DIR}"
    log_info "日志目录已删除"
fi

# 8. 恢复原有 BIND9 配置
if [[ -f /etc/bind/named.conf.local.${APP_NAME}.bak ]]; then
    log_warn "是否恢复原有 BIND9 配置? (y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        cp /etc/bind/named.conf.local.${APP_NAME}.bak /etc/bind/named.conf.local
        rm -f /etc/bind/named.conf.local.${APP_NAME}.bak
        log_info "BIND9 配置已恢复"
    else
        log_info "保留当前 BIND9 配置"
    fi
fi

# 9. 重启 BIND9 (如果存在)
if systemctl list-unit-files | grep -q "^bind9.service"; then
    log_info "重启 BIND9 服务..."
    systemctl restart bind9 2>/dev/null || true
fi

echo ""
echo "============================================"
echo "  卸载完成!"
echo "============================================"
echo ""
log_info "如需重新安装，请运行: sudo ./install.sh"
echo ""
log_info "如需卸载 BIND9，请自行执行:"
echo "  sudo apt remove --purge bind9 bind9utils bind9-doc"
echo "  sudo apt autoremove"
echo ""
