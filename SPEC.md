# Simple BIND9 Panel - 项目规范

## 概述

一个基于 Web 的 BIND9 DNS 服务器管理面板，支持管理 DNS 区域、记录和服务器配置。

## 技术栈

- **后端**: Go + Gin 框架
- **前端**: React + TypeScript + Vite
- **通信**: RESTful API

## 核心功能

### 1. 服务器状态
- 显示 BIND9 服务运行状态
- 启动/停止/重启服务
- 查看实时查询统计

### 2. 区域管理
- 列出所有配置的 DNS 区域
- 创建/编辑/删除正向和反向区域
- 区域传输状态

### 3. 记录管理
- 列出区域内的所有 DNS 记录
- 添加/编辑/删除记录（A, AAAA, CNAME, MX, TXT, NS, PTR 等）
- 批量导入/导出

### 4. 配置管理
- 查看/编辑 named.conf 主配置
- 语法验证
- 配置备份与还原

### 5. 日志查看
- 实时 DNS 查询日志
- 错误日志
- 日志搜索与过滤

## 项目结构

```
simple-bind9-panel/
├── backend/
│   ├── main.go           # 入口
│   ├── config/           # 配置
│   ├── handlers/         # HTTP 处理器
│   ├── services/         # 业务逻辑
│   ├── models/           # 数据模型
│   └── database/         # 数据库（SQLite）
├── frontend/
│   ├── src/
│   │   ├── App.tsx       # 主组件
│   │   └── ...
│   ├── index.html
│   └── package.json
├── SPEC.md
└── README.md
```

## API 设计

### 服务器
- `GET /api/status` - 获取服务状态
- `POST /api/server/restart` - 重启服务

### 区域
- `GET /api/zones` - 列出所有区域
- `POST /api/zones` - 创建区域
- `GET /api/zones/:name` - 获取区域详情
- `PUT /api/zones/:name` - 更新区域
- `DELETE /api/zones/:name` - 删除区域

### 记录
- `GET /api/zones/:name/records` - 列出区域记录
- `POST /api/zones/:name/records` - 添加记录
- `PUT /api/zones/:name/records/:id` - 更新记录
- `DELETE /api/zones/:name/records/:id` - 删除记录

### 配置
- `GET /api/config` - 获取配置
- `PUT /api/config` - 更新配置
- `POST /api/config/validate` - 验证配置

## 数据模型

### Zone
- ID, Name, Type (master/slave/forward), File, Records

### Record
- ID, ZoneID, Name, Type, TTL, Priority, Value

## 安全考虑

- 本地访问优先
- 配置修改前自动备份
- 操作日志记录
