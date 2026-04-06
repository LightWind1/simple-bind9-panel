# Simple BIND9 Panel - Multi-stage Build
# 包含 BIND9 DNS 服务器 + Web 管理面板

# ============ Stage 1: Build Go ============
FROM golang:1.22-alpine AS builder

WORKDIR /build

# 复制源码和依赖
COPY backend/go.mod ./
COPY backend/ ./
COPY frontend/dist/ frontend/dist/

# 获取依赖（生成 go.sum）
RUN go mod tidy && go mod download

# 编译（静态链接）
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o server .

# ============ Stage 2: Final Image ============
FROM debian:bookworm-slim

# 安装系统包和 BIND9
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    bind9 \
    bind9utils \
    bind9-doc \
    supervisor \
    procps \
    psmisc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 创建必要目录
RUN mkdir -p /var/log/supervisor /var/run/named /etc/bind /app/data /app/backups

# 从 builder 复制编译好的二进制
COPY --from=builder /build/server /app/server

# 复制配置（只读挂载）
COPY config/named.conf /etc/bind/named.conf
COPY config/named.conf.options /etc/bind/named.conf.options
COPY config/named.conf.local /etc/bind/named.conf.local
COPY config/zones /etc/bind/zones

# 复制 supervisor 配置
COPY config/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 环境变量
ENV PORT=8890
ENV DATA_DIR=/app/data
ENV BACKUP_DIR=/app/backups
ENV CONFIG_DIR=/app/config
ENV NAMED_CONF=/etc/bind/named.conf

# 端口
EXPOSE 8890 53/udp 53/tcp 953

# 启动 supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
