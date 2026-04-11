# Simple BIND9 Panel

基于 Web 的 BIND9 DNS 服务器管理面板。

## 功能

- 🌐 **DNS 区域管理** - 创建、编辑、删除 DNS 区域
- 📝 **记录管理** - 支持 A, AAAA, CNAME, MX, TXT, NS 等记录类型
- ⚙️ **配置管理** - 在线编辑 BIND9 配置文件
- ✓ **配置验证** - 保存前验证配置语法是否正确
- 📋 **版本历史** - 配置修改前自动备份，支持预览和恢复
- 📊 **服务监控** - 查看 BIND9 运行状态、版本、运行时长
- 📜 **查询日志** - 实时查看 DNS 查询日志
- 🔄 **DNS 转发器** - 管理上游 DNS 转发服务器

## 快速开始

### Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 访问面板
open http://localhost:8890

# 默认账号: admin
# 默认密码: admin
```

### VM 直接部署

```bash
# 1. 克隆项目
git clone https://github.com/LightWind1/simple-bind9-panel.git
cd simple-bind9-panel

# 2. 运行安装脚本
chmod +x install.sh
sudo ./install.sh

# 3. 访问面板
open http://localhost:8890
```

## 系统要求

- Debian/Ubuntu (其他 Linux 发行版请自行适配)
- BIND9 已安装
- Go 1.22+ (仅构建时需要)

## 目录结构

```
simple-bind9-panel/
├── backend/
│   ├── main.go              # 主程序入口（嵌入式前端）
│   ├── config/              # 配置管理
│   ├── handlers/            # HTTP API 处理器
│   ├── services/           # BIND9 控制服务
│   ├── models/              # 数据模型
│   ├── database/            # SQLite 数据库
│   └── frontend/dist/       # 嵌入式前端
├── frontend/
│   ├── src/App.tsx          # React 主组件
│   └── dist/                # 构建产物
├── config/                  # Docker 配置文件
│   ├── named.conf           # BIND9 主配置
│   └── supervisord.conf     # 进程管理
├── docker-compose.yml
├── Dockerfile
└── install.sh              # 一键安装脚本
```

## 配置版本管理

每次保存配置前，系统会自动创建备份：

1. 点击 **"版本历史"** 查看所有备份
2. 选择任意版本，点击 **"预览"** 查看内容
3. 点击 **"恢复"** 回滚到指定版本

备份文件存储在 `/app/backups/` 目录。

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | :8890 | Web 服务端口 |
| DATA_DIR | /app/data | 数据目录（SQLite 数据库） |
| BACKUP_DIR | /app/backups | 备份目录 |
| NAMED_CONF | /etc/bind/named.conf | BIND9 配置文件路径 |

## API 接口

### 认证
- `POST /api/auth/login` - 登录
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/me` - 当前用户信息

### 状态监控
- `GET /api/status` - 服务状态
- `POST /api/server/reload` - 重载 BIND9 配置
- `POST /api/server/restart` - 重启 BIND9

### 区域管理
- `GET /api/zones` - 区域列表
- `POST /api/zones` - 创建区域
- `GET /api/zones/:name` - 区域详情
- `PUT /api/zones/:name` - 更新区域
- `DELETE /api/zones/:name` - 删除区域
- `GET /api/zones/:name/records` - 记录列表
- `POST /api/zones/:name/records` - 添加记录
- `PUT /api/zones/:name/records/:id` - 更新记录
- `DELETE /api/zones/:name/records/:id` - 删除记录

### 配置管理
- `GET /api/config` - 获取 BIND9 配置
- `PUT /api/config` - 保存配置
- `POST /api/config/validate` - 验证配置语法
- `GET /api/config/backup` - 备份列表
- `GET /api/config/backup/:name/content` - 获取备份内容
- `POST /api/config/backup/:name/restore` - 恢复备份

### 日志
- `GET /api/logs?lines=100&filter=keyword` - 查询日志

### DNS 转发器
- `GET /api/forwarders` - 转发器列表
- `POST /api/forwarders` - 添加转发器
- `PUT /api/forwarders/:id` - 更新转发器
- `DELETE /api/forwarders/:id` - 删除转发器

## 技术栈

- **后端**: Go + Gin + SQLite
- **前端**: React + TypeScript
- **DNS**: BIND9
- **进程管理**: Supervisor (Docker)

## 安全说明

- 默认账号密码为 `admin/admin`，**请首次登录后修改密码**
- 配置修改需要 BIND9 配置文件的写权限
- 建议在内网环境使用，勿暴露到公网

## 截图

```
┌─────────────────────────────────────────────────┐
│  🌐 DNS Management                                │
├─────────┬───────────────────────────────────────┤
│ Dashboard│  服务状态: 运行中                      │
│ Zones   │  版本: BIND 9.18                      │
│ Forwards│  运行时长: 7 days                      │
│ Config  │  查询次数: 1,234,567                   │
│ Logs    │                                       │
└─────────┴───────────────────────────────────────┘
```
