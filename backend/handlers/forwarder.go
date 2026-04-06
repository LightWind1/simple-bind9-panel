package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"simple-bind9-panel/config"
	"simple-bind9-panel/database"
	"simple-bind9-panel/models"
	"simple-bind9-panel/services"
)

// ForwarderHandler DNS转发处理器
type ForwarderHandler struct{}

func NewForwarderHandler() *ForwarderHandler {
	return &ForwarderHandler{}
}

// ListForwarders 列出所有转发配置
func (h *ForwarderHandler) ListForwarders(c *gin.Context) {
	c.JSON(http.StatusOK, database.DB.Forwarders)
}

// CreateForwarder 创建转发配置
func (h *ForwarderHandler) CreateForwarder(c *gin.Context) {
	var forwarder models.Forwarder
	if err := c.ShouldBindJSON(&forwarder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	forwarder.ID = uint(time.Now().UnixNano())
	forwarder.CreatedAt = time.Now()
	forwarder.UpdatedAt = time.Now()
	forwarder.Enabled = true

	database.DB.Forwarders = append(database.DB.Forwarders, forwarder)
	if err := database.Save(config.DBPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
		return
	}

	// 更新 BIND 配置
	if err := services.UpdateForwardersConfig(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update BIND config: " + err.Error()})
		return
	}

	// 重载 BIND
	services.ReloadNamed()

	c.JSON(http.StatusCreated, forwarder)
}

// UpdateForwarder 更新转发配置
func (h *ForwarderHandler) UpdateForwarder(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i, f := range database.DB.Forwarders {
		if f.ID == uint(id) {
			if v, ok := updates["name"]; ok {
				database.DB.Forwarders[i].Name = v.(string)
			}
			if v, ok := updates["servers"]; ok {
				database.DB.Forwarders[i].Servers = v.(string)
			}
			if v, ok := updates["domains"]; ok {
				database.DB.Forwarders[i].Domains = v.(string)
			}
			if v, ok := updates["enabled"]; ok {
				database.DB.Forwarders[i].Enabled = v.(bool)
			}
			database.DB.Forwarders[i].UpdatedAt = time.Now()

			if err := database.Save(config.DBPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
				return
			}

			// 更新 BIND 配置
			if err := services.UpdateForwardersConfig(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update BIND config"})
				return
			}

			services.ReloadNamed()
			c.JSON(http.StatusOK, database.DB.Forwarders[i])
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Forwarder not found"})
}

// DeleteForwarder 删除转发配置
func (h *ForwarderHandler) DeleteForwarder(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	for i, f := range database.DB.Forwarders {
		if f.ID == uint(id) {
			database.DB.Forwarders = append(database.DB.Forwarders[:i], database.DB.Forwarders[i+1:]...)
			if err := database.Save(config.DBPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
				return
			}

			// 更新 BIND 配置
			if err := services.UpdateForwardersConfig(); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update BIND config"})
				return
			}

			services.ReloadNamed()
			c.JSON(http.StatusOK, gin.H{"message": "Forwarder deleted"})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Forwarder not found"})
}
