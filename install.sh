#!/bin/bash
# Simple BIND9 Panel 一键安装脚本 (Debian/Ubuntu)
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
log_err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo "============================================"
echo "  Simple BIND9 Panel 安装脚本"
echo "============================================"
echo ""

# 检查是否为 root
if [[ $EUID -ne 0 ]]; then
   log_err "请使用 sudo 运行此脚本"
fi

# 检查 OS
if [[ ! -f /etc/debian_version ]]; then
    log_err "此脚本仅支持 Debian/Ubuntu 系统"
fi

log_info "开始安装 Simple BIND9 Panel..."

# 1. 检查并安装依赖
log_info "检查依赖..."

if ! command -v go &> /dev/null; then
    log_warn "Go 未安装，正在安装..."
    apt update
    apt install -y golang-go
fi

if ! dpkg -l | grep -q "^ii  bind9 "; then
    log_warn "BIND9 未安装，正在安装..."
    apt update
    apt install -y bind9 bind9utils
fi

# 2. 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 3. 构建后端
log_info "构建后端..."

if [[ ! -f "${SCRIPT_DIR}/backend/server" ]]; then
    cd "${SCRIPT_DIR}/backend"
    
    # 确保前端文件存在
    if [[ ! -d "frontend/dist" ]]; then
        log_info "复制前端文件..."
        mkdir -p frontend/dist
        cp -r "${SCRIPT_DIR}/frontend/dist/"* frontend/dist/ 2>/dev/null || true
    fi
    
    # 构建
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server .
else
    log_info "后端已构建，跳过"
fi

# 4. 创建目录
log_info "创建目录..."
mkdir -p "${APP_DIR}"
mkdir -p "${DATA_DIR}"
mkdir -p "${CONFIG_DIR}"
mkdir -p "${LOG_DIR}"

# 5. 备份原有 BIND9 配置
if [[ -f /etc/bind/named.conf.local ]] && [[ ! -f /etc/bind/named.conf.local.${APP_NAME}.bak ]]; then
    log_info "备份原有 BIND9 配置..."
    cp /etc/bind/named.conf.local /etc/bind/named.conf.local.${APP_NAME}.bak
fi

# 6. 复制文件
log_info "复制文件..."
cp "${SCRIPT_DIR}/backend/server" "${BINARY_PATH}"
chmod +x "${BINARY_PATH}"

cp -r "${SCRIPT_DIR}/config/"* "${CONFIG_DIR}/"
cp "${SCRIPT_DIR}/config/named.conf" /etc/bind/named.conf
cp "${CONFIG_DIR}/named.conf.local" /etc/bind/named.conf.local
cp "${CONFIG_DIR}/named.conf.options" /etc/bind/named.conf.options

# BIND9 配置 bind 可写（方便 web 面板修改）
chown bind:bind /etc/bind/named.conf /etc/bind/named.conf.local /etc/bind/named.conf.options
chmod 660 /etc/bind/named.conf /etc/bind/named.conf.local /etc/bind/named.conf.options
chown -R bind:bind /var/cache/bind

# 创建应用数据目录并设置权限
mkdir -p "${DATA_DIR}"
chown -R bind:bind "${DATA_DIR}"

# 创建备份目录
mkdir -p "${APP_DIR}/backups"
chown -R bind:bind "${APP_DIR}/backups"

# 7. 配置 rndc 权限 - 让 bind 用户可以执行 rndc reload
log_info "配置 rndc 权限..."
echo 'bind ALL=(root) NOPASSWD: /usr/sbin/rndc reload, /usr/sbin/rndc status, /usr/sbin/named-checkconf, /usr/sbin/named-checkzone' > /etc/sudoers.d/bind-panel
chmod 440 /etc/sudoers.d/bind-panel

# 8. 创建 systemd 服务
log_info "创建 systemd 服务..."
cat > "${SERVICE_FILE}" << EOF
[Unit]
Description=Simple BIND9 Panel
After=network.target

[Service]
Type=simple
User=bind
Group=bind
ExecStart=${BINARY_PATH}
Restart=on-failure
RestartSec=5s
Environment=PORT=:8890
Environment=DATA_DIR=${DATA_DIR}
Environment=BACKUP_DIR=${APP_DIR}/backups
Environment=CONFIG_DIR=${CONFIG_DIR}
Environment=NAMED_CONF=/etc/bind/named.conf
WorkingDirectory=${APP_DIR}

# 安全相关
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DATA_DIR} ${APP_DIR} ${LOG_DIR}

[Install]
WantedBy=multi-user.target
EOF

# 8. 重新加载 systemd
systemctl daemon-reload

# 9. 启动服务
log_info "启动服务..."
systemctl enable ${APP_NAME}.service
systemctl restart ${APP_NAME}.service

# 等待服务启动
sleep 2

# 10. 检查状态
if systemctl is-active --quiet ${APP_NAME}.service; then
    log_info "服务启动成功!"
else
    log_err "服务启动失败，请检查日志: journalctl -u ${APP_NAME}.service -n 50"
fi

echo ""
echo "============================================"
echo "  安装完成!"
echo "============================================"
echo ""
echo "访问地址: http://localhost:8890"
echo "默认账号: admin"
echo "默认密码: admin"
echo ""
echo "常用命令:"
echo "  查看状态: systemctl status ${APP_NAME}"
echo "  查看日志: journalctl -u ${APP_NAME} -f"
echo "  重启服务: systemctl restart ${APP_NAME}"
echo "  停止服务: systemctl stop ${APP_NAME}"
echo ""
echo "配置文件: ${CONFIG_DIR}"
echo "数据目录: ${DATA_DIR}"
echo ""
