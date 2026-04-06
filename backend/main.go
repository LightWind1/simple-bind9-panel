package main

import (
	"embed"
	"log"
	"os"
	"strings"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"simple-bind9-panel/config"
	"simple-bind9-panel/database"
	"simple-bind9-panel/handlers"
	"simple-bind9-panel/middleware"
	"simple-bind9-panel/services"
)

//go:embed frontend/dist
var frontend embed.FS

func main() {
	// 初始化配置
	config.Init()

	// 初始化数据库
	database.Init(config.DBPath)

	// 初始化默认管理员用户
	handlers.InitDefaultUser()

	// 初始化服务
	services.Init()

	// 创建 Gin 路由
	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// 初始化处理器
	serverHandler := handlers.NewServerHandler()
	zoneHandler := handlers.NewZoneHandler()
	configHandler := handlers.NewConfigHandler()
	forwarderHandler := handlers.NewForwarderHandler()
	logHandler := handlers.NewLogHandler()
	authHandler := handlers.NewAuthHandler()

	// 公开 API 路由（无需认证）
	apiPublic := r.Group("/api")
	{
		apiPublic.POST("/auth/login", authHandler.Login)
		apiPublic.POST("/auth/refresh", authHandler.Refresh)
	}

	// 受保护的 API 路由（需要认证）
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// 用户信息
		api.GET("/auth/me", authHandler.Me)

		// 服务器状态
		api.GET("/status", serverHandler.GetStatus)
		api.POST("/server/restart", serverHandler.Restart)
		api.POST("/server/reload", serverHandler.Reload)

		// 区域管理
		api.GET("/zones", zoneHandler.ListZones)
		api.GET("/zones/:name", zoneHandler.GetZone)
		api.POST("/zones", zoneHandler.CreateZone)
		api.PUT("/zones/:name", zoneHandler.UpdateZone)
		api.DELETE("/zones/:name", zoneHandler.DeleteZone)

		// 记录管理
		api.GET("/zones/:name/records", zoneHandler.ListRecords)
		api.POST("/zones/:name/records", zoneHandler.CreateRecord)
		api.PUT("/zones/:name/records/:id", zoneHandler.UpdateRecord)
		api.DELETE("/zones/:name/records/:id", zoneHandler.DeleteRecord)

		// 配置管理
		api.GET("/config", configHandler.GetConfig)
		api.PUT("/config", configHandler.UpdateConfig)
		api.POST("/config/validate", configHandler.ValidateConfig)
		api.GET("/config/backup", configHandler.ListBackups)
		api.POST("/config/backup/:name/restore", configHandler.RestoreBackup)

		// DNS转发管理
		api.GET("/forwarders", forwarderHandler.ListForwarders)
		api.POST("/forwarders", forwarderHandler.CreateForwarder)
		api.PUT("/forwarders/:id", forwarderHandler.UpdateForwarder)
		api.DELETE("/forwarders/:id", forwarderHandler.DeleteForwarder)

		// 日志查看
		api.GET("/logs", logHandler.GetLogs)
	}

	// 首页 - 直接从 embed 读取
	r.GET("/", func(c *gin.Context) {
		c.Header("Content-Type", "text/html; charset=utf-8")
		data, err := frontend.ReadFile("frontend/dist/index.html")
		if err != nil {
			c.String(500, "Failed to load index.html")
			return
		}
		c.Data(200, "text/html; charset=utf-8", data)
	})

	// 静态资源 /assets/* 映射到 frontend/dist/assets/*
	r.GET("/assets/*filepath", func(c *gin.Context) {
		filepath := c.Param("filepath")
		// 去掉前导 /
		filepath = strings.TrimPrefix(filepath, "/")
		fullPath := "frontend/dist/assets/" + filepath

		data, err := frontend.ReadFile(fullPath)
		if err != nil {
			c.Status(404)
			return
		}

		// 根据文件扩展名设置 Content-Type
		ext := ""
		if idx := strings.LastIndex(filepath, "."); idx != -1 {
			ext = filepath[idx:]
		}
		contentType := "application/octet-stream"
		switch ext {
		case ".js":
			contentType = "application/javascript"
		case ".css":
			contentType = "text/css"
		case ".html":
			contentType = "text/html"
		case ".json":
			contentType = "application/json"
		case ".png":
			contentType = "image/png"
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".svg":
			contentType = "image/svg+xml"
		case ".woff", ".woff2":
			contentType = "font/woff"
		case ".map":
			contentType = "application/json"
		}

		c.Header("Content-Type", contentType)
		c.Data(200, contentType, data)
	})

	// 健康检查（不需要认证）
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	port := config.Port
	if port == "" {
		port = ":8890"
	}

	log.Printf("BIND9 Panel starting on %s", port)
	if err := r.Run(port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func init() {
	// 确保数据目录存在
	os.MkdirAll(config.DataDir, 0755)
	os.MkdirAll(config.BackupDir, 0755)
}
