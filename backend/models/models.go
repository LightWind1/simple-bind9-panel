package models

import (
	"time"
)

// Zone DNS 区域
type Zone struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"uniqueIndex;size:255"` // example: example.com
	Type      string    `json:"type" gorm:"size:20"`              // master, slave, forward
	File      string    `json:"file" gorm:"size:500"`              // zone file path
	Master    string    `json:"master" gorm:"size:255"`           // for slave zones
	AllowTransfer string `json:"allow_transfer" gorm:"size:255"` // ACL for zone transfer
	Recursion bool      `json:"recursion" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Record DNS 记录
type Record struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	ZoneID    uint      `json:"zone_id" gorm:"index"`
	Name      string    `json:"name" gorm:"size:255"`      // record name
	Type      string    `json:"type" gorm:"size:10"`       // A, AAAA, CNAME, MX, TXT, etc.
	TTL       int       `json:"ttl" gorm:"default:3600"`   // Time to live
	Priority  int       `json:"priority"`                  // for MX, SRV records
	Value     string    `json:"value" gorm:"type:text"`    // record value
	Comment   string    `json:"comment" gorm:"size:500"`   // optional comment
	Enabled   bool      `json:"enabled" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ConfigBackup 配置备份
type ConfigBackup struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:255"`
	FilePath  string    `json:"file_path" gorm:"size:500"`
	CreatedAt time.Time `json:"created_at"`
}

// ServerStatus 服务器状态
type ServerStatus struct {
	Running       bool   `json:"running"`
	Version      string `json:"version"`
	Uptime       string `json:"uptime"`
	Queries      int64  `json:"queries"`
	ZoneCount    int64  `json:"zone_count"`
	RecordCount  int64  `json:"record_count"`
}

// Forwarder DNS转发配置
type Forwarder struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"size:255"`      // 配置名称
	Servers   string    `json:"servers" gorm:"size:500"`   // DNS服务器，逗号分隔，如 "8.8.8.8,1.1.1.1"
	Domains   string    `json:"domains" gorm:"size:500"`   // 匹配的域名，逗号分隔，空表示全部
	Enabled   bool      `json:"enabled" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// User 用户
type User struct {
	ID           string    `json:"id" gorm:"primaryKey;size:36"`
	Username     string    `json:"username" gorm:"uniqueIndex;size:100"`
	PasswordHash string    `json:"password_hash" gorm:"size:255"`
	Email        string    `json:"email" gorm:"size:255"`
	Role         string    `json:"role" gorm:"size:20;default:admin"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}
