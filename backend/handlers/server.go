package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"simple-bind9-panel/database"
	"simple-bind9-panel/models"
	"simple-bind9-panel/services"
)

// ServerHandler 服务器处理器
type ServerHandler struct{}

func NewServerHandler() *ServerHandler {
	return &ServerHandler{}
}

// GetStatus 获取服务器状态
func (h *ServerHandler) GetStatus(c *gin.Context) {
	status := services.GetServerStatus()

	// 获取数据库统计
	database.DB.Zones = append([]models.Zone{}, database.DB.Zones...)
	status.ZoneCount = int64(len(database.DB.Zones))
	status.RecordCount = int64(len(database.DB.Records))

	c.JSON(http.StatusOK, status)
}

// Restart 重启 BIND
func (h *ServerHandler) Restart(c *gin.Context) {
	if err := services.RestartNamed(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "BIND restarted"})
}

// Reload 重载配置
func (h *ServerHandler) Reload(c *gin.Context) {
	if err := services.ReloadNamed(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "BIND reloaded"})
}
