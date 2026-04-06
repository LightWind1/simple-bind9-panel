package config

import (
	"os"
	"path/filepath"
	"strings"
)

var (
	Port      string
	DataDir   string
	DBPath    string
	BackupDir string
	RNDCPath  string
	NamedConf string
	JWTSecret string
)

func Init() {
	// 默认配置 - 使用 /app 作为容器内默认路径
	DataDir = getEnv("DATA_DIR", "/app/data")
	DBPath = filepath.Join(DataDir, "bind9.json")
	BackupDir = getEnv("BACKUP_DIR", "/app/backups")
	RNDCPath = findRNDCTool()
	NamedConf = getEnv("NAMED_CONF", "/etc/bind/named.conf")
	Port = getEnv("PORT", ":8890")
	if !strings.HasPrefix(Port, ":") {
		Port = ":" + Port
	}

	JWTSecret = getEnv("JWT_SECRET", "change-this-secret-in-production")
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

func findRNDCTool() string {
	paths := []string{
		"/usr/sbin/rndc",
		"/usr/bin/rndc",
		"/sbin/rndc",
		"/bin/rndc",
	}
	for _, p := range paths {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return "rndc" // 默认使用 PATH 中的 rndc
}
