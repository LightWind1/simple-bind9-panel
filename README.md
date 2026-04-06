# Simple BIND9 Panel

基于 Web 的 BIND9 DNS 服务器管理面板。

## 功能

- 🌐 DNS 区域管理（正向/反向区域）
- 📝 记录管理（A, AAAA, CNAME, MX, TXT, NS, PTR 等）
- ⚙️ BIND9 配置管理
- 📊 服务状态监控
- 📜 查询日志查看
- 🔄 DNS 转发器管理

## 快速开始

### Docker 部署（推荐）

```bash
# 构建并启动
docker-compose up -d

# 访问面板
open http://localhost:8890
```

### VM 直接部署

**前提条件：**
- Go 1.22+
- BIND9 已安装

```bash
# 1. 安装 BIND9
sudo apt install bind9 bind9utils

# 2. 构建
chmod +x build.sh
./build.sh

# 3. 部署后端
sudo cp backend/server /usr/local/bin/bind9-panel
sudo mkdir -p /app/data /app/backups
sudo chown -R bind:bind /etc/bind /var/cache/bind

# 4. 运行
sudo /usr/local/bin/bind9-panel
```

## 项目结构

```
simple-bind9-panel/
├── backend/
│   ├── main.go           # 主程序入口（含前端嵌入）
│   ├── config/           # 配置管理
│   ├── handlers/         # HTTP 处理器
│   ├── services/         # 业务逻辑（BIND9 控制）
│   ├── models/           # 数据模型
│   ├── database/         # SQLite 数据库
│   └── frontend/dist/    # 嵌入式前端
├── frontend/
│   ├── src/              # React 源码
│   └── dist/             # 构建产物
├── config/               # Docker 配置文件
│   ├── named.conf        # BIND9 主配置
│   ├── zones/            # 区域文件
│   └── supervisord.conf   # 进程管理
├── docker-compose.yml
├── Dockerfile
└── SPEC.md
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | :8890 | Web 服务端口 |
| DATA_DIR | /app/data | 数据目录 |
| BACKUP_DIR | /app/backups | 备份目录 |
| NAMED_CONF | /etc/bind/named.conf | BIND9 配置路径 |

## API

- `GET /api/status` - 服务状态
- `GET /api/zones` - 区域列表
- `POST /api/zones` - 创建区域
- `GET /api/zones/:name/records` - 区域记录
- `GET /api/config` - BIND9 配置
- `GET /api/logs` - 查询日志

## 技术栈

- **后端**: Go + Gin + SQLite
- **前端**: React + TypeScript
- **DNS**: BIND9
- **进程管理**: Supervisor (Docker)
