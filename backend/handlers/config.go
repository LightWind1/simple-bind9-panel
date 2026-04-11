package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"simple-bind9-panel/config"
	"simple-bind9-panel/database"
	"simple-bind9-panel/models"
	"simple-bind9-panel/services"
)

// ConfigHandler 配置处理器
type ConfigHandler struct{}

func NewConfigHandler() *ConfigHandler {
	return &ConfigHandler{}
}

// GetConfig 获取当前配置（结构化）
func (h *ConfigHandler) GetConfig(c *gin.Context) {
	// 获取原始内容
	content, err := os.ReadFile(config.NamedConf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read config: " + err.Error()})
		return
	}

	// 解析为结构化数据
	namedConfig, err := services.ParseNamedConf(config.NamedConf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse config: " + err.Error()})
		return
	}

	namedConfig.RawContent = string(content)

	c.JSON(http.StatusOK, namedConfig)
}

// GetRawConfig 获取原始配置内容
func (h *ConfigHandler) GetRawConfig(c *gin.Context) {
	content, err := os.ReadFile(config.NamedConf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read config"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"content": string(content),
		"path":    config.NamedConf,
	})
}

// UpdateConfig 更新配置
func (h *ConfigHandler) UpdateConfig(c *gin.Context) {
	var req struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 创建备份
	backupName := "pre-update-" + time.Now().Format("20060102-150405")
	if err := services.CreateBackup(backupName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create backup: " + err.Error()})
		return
	}

	// 验证配置
	if err := services.ValidateConfig(req.Content); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Config validation failed: " + err.Error()})
		return
	}

	// 写入配置
	if err := os.WriteFile(config.NamedConf, []byte(req.Content), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write config: " + err.Error()})
		return
	}

	// 重载 BIND
	services.ReloadNamed()

	c.JSON(http.StatusOK, gin.H{"message": "Config updated"})
}

// UpdateOptions 更新全局选项
func (h *ConfigHandler) UpdateOptions(c *gin.Context) {
	var opts models.Options
	if err := c.ShouldBindJSON(&opts); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 读取当前配置
	content, err := os.ReadFile(config.NamedConf)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read config"})
		return
	}

	// 生成新的 options 块
	newOptionsBlock := services.GenerateOptionsBlock(opts)

	// 简单替换: 找到 options { ... } 块并替换
	newContent := services.ReplaceOptionsBlock(string(content), newOptionsBlock)

	// 备份
	backupName := "pre-update-" + time.Now().Format("20060102-150405")
	services.CreateBackup(backupName)

	// 验证
	if err := services.ValidateConfig(newContent); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Config validation failed: " + err.Error()})
		return
	}

	// 写入
	if err := os.WriteFile(config.NamedConf, []byte(newContent), 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write config"})
		return
	}

	services.ReloadNamed()

	c.JSON(http.StatusOK, gin.H{"message": "Options updated"})
}

// ValidateConfig 验证配置
func (h *ConfigHandler) ValidateConfig(c *gin.Context) {
	var req struct {
		Content string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.ValidateConfig(req.Content); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"valid": true})
}

// ListBackups 列出备份
func (h *ConfigHandler) ListBackups(c *gin.Context) {
	c.JSON(http.StatusOK, database.DB.Backups)
}

// GetBackupContent 获取备份内容
func (h *ConfigHandler) GetBackupContent(c *gin.Context) {
	name := c.Param("name")

	// 找到备份
	var backupPath string
	for _, b := range database.DB.Backups {
		if b.Name == name {
			backupPath = b.FilePath
			break
		}
	}

	if backupPath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup not found"})
		return
	}

	content, err := os.ReadFile(backupPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read backup"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"content": string(content)})
}

// RestoreBackup 恢复备份
func (h *ConfigHandler) RestoreBackup(c *gin.Context) {
	name := c.Param("name")

	// 找到备份
	var backupPath string
	for _, b := range database.DB.Backups {
		if b.Name == name {
			backupPath = b.FilePath
			break
		}
	}

	if backupPath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Backup not found"})
		return
	}

	// 读取备份内容
	content, err := os.ReadFile(backupPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read backup"})
		return
	}

	// 恢复前先备份当前配置
	currentBackup := "pre-restore-" + time.Now().Format("20060102-150405")
	if err := services.CreateBackup(currentBackup); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create pre-restore backup"})
		return
	}

	// 写入配置
	if err := os.WriteFile(config.NamedConf, content, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to restore config"})
		return
	}

	// 重载 BIND
	services.ReloadNamed()

	c.JSON(http.StatusOK, gin.H{"message": "Config restored from backup"})
}
