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

// ZoneHandler 区域处理器
type ZoneHandler struct{}

func NewZoneHandler() *ZoneHandler {
	return &ZoneHandler{}
}

// ListZones 列出所有区域
func (h *ZoneHandler) ListZones(c *gin.Context) {
	database.DB.Zones = append([]models.Zone{}, database.DB.Zones...)
	c.JSON(http.StatusOK, database.DB.Zones)
}

// GetZone 获取单个区域
func (h *ZoneHandler) GetZone(c *gin.Context) {
	name := c.Param("name")
	for _, zone := range database.DB.Zones {
		if zone.Name == name {
			c.JSON(http.StatusOK, zone)
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
}

// CreateZone 创建区域
func (h *ZoneHandler) CreateZone(c *gin.Context) {
	var zone models.Zone
	if err := c.ShouldBindJSON(&zone); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 设置默认值
	zone.ID = uint(time.Now().UnixNano())
	zone.CreatedAt = time.Now()
	zone.UpdatedAt = time.Now()
	if zone.File == "" {
		zone.File = "/var/cache/bind/db." + zone.Name
	}

	// 创建区域文件
	if err := services.CreateZoneFile(zone); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 保存到数据库
	database.DB.Zones = append(database.DB.Zones, zone)
	if err := database.Save(config.DBPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
		return
	}

	// 重载 BIND
	services.ReloadNamed()

	c.JSON(http.StatusCreated, zone)
}

// UpdateZone 更新区域配置
func (h *ZoneHandler) UpdateZone(c *gin.Context) {
	name := c.Param("name")
	
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i, zone := range database.DB.Zones {
		if zone.Name == name {
			// 应用更新
			if v, ok := updates["type"]; ok {
				database.DB.Zones[i].Type = v.(string)
			}
			if v, ok := updates["file"]; ok {
				database.DB.Zones[i].File = v.(string)
			}
			database.DB.Zones[i].UpdatedAt = time.Now()
			
			if err := database.Save(config.DBPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
				return
			}

			services.ReloadNamed()
			c.JSON(http.StatusOK, database.DB.Zones[i])
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
}

// DeleteZone 删除区域
func (h *ZoneHandler) DeleteZone(c *gin.Context) {
	name := c.Param("name")

	for i, zone := range database.DB.Zones {
		if zone.Name == name {
			// 删除关联记录
			var newRecords []models.Record
			for _, r := range database.DB.Records {
				if r.ZoneID != zone.ID {
					newRecords = append(newRecords, r)
				}
			}
			database.DB.Records = newRecords

			// 删除区域
			database.DB.Zones = append(database.DB.Zones[:i], database.DB.Zones[i+1:]...)

			// 删除区域文件
			services.DeleteZoneFile(zone)

			if err := database.Save(config.DBPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
				return
			}

			services.ReloadNamed()
			c.JSON(http.StatusOK, gin.H{"message": "Zone deleted"})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
}

// ListRecords 列出区域的记录
func (h *ZoneHandler) ListRecords(c *gin.Context) {
	name := c.Param("name")
	
	// 找到 zone
	var zoneID uint
	for _, zone := range database.DB.Zones {
		if zone.Name == name {
			zoneID = zone.ID
			break
		}
	}
	
	if zoneID == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
		return
	}

	var records []models.Record
	for _, r := range database.DB.Records {
		if r.ZoneID == zoneID {
			records = append(records, r)
		}
	}
	c.JSON(http.StatusOK, records)
}

// CreateRecord 添加记录
func (h *ZoneHandler) CreateRecord(c *gin.Context) {
	name := c.Param("name")
	
	// 找到 zone
	var zone *models.Zone
	for _, z := range database.DB.Zones {
		if z.Name == name {
			zone = &z
			break
		}
	}
	
	if zone == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
		return
	}

	var record models.Record
	if err := c.ShouldBindJSON(&record); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	record.ID = uint(time.Now().UnixNano())
	record.ZoneID = zone.ID
	record.CreatedAt = time.Now()
	record.UpdatedAt = time.Now()
	record.Enabled = true
	if record.TTL == 0 {
		record.TTL = 3600
	}

	database.DB.Records = append(database.DB.Records, record)

	// 更新区域文件
	services.UpdateZoneFile(*zone)

	if err := database.Save(config.DBPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
		return
	}

	// 重载 BIND
	services.ReloadNamed()

	c.JSON(http.StatusCreated, record)
}

// UpdateRecord 更新记录
func (h *ZoneHandler) UpdateRecord(c *gin.Context) {
	name := c.Param("name")
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	// 找到 zone
	var zone *models.Zone
	for _, z := range database.DB.Zones {
		if z.Name == name {
			zone = &z
			break
		}
	}
	
	if zone == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i, r := range database.DB.Records {
		if r.ID == uint(id) && r.ZoneID == zone.ID {
			if v, ok := updates["name"]; ok {
				database.DB.Records[i].Name = v.(string)
			}
			if v, ok := updates["type"]; ok {
				database.DB.Records[i].Type = v.(string)
			}
			if v, ok := updates["ttl"]; ok {
				database.DB.Records[i].TTL = int(v.(float64))
			}
			if v, ok := updates["priority"]; ok {
				database.DB.Records[i].Priority = int(v.(float64))
			}
			if v, ok := updates["value"]; ok {
				database.DB.Records[i].Value = v.(string)
			}
			database.DB.Records[i].UpdatedAt = time.Now()
			
			if err := database.Save(config.DBPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
				return
			}

			// 更新区域文件
			services.UpdateZoneFile(*zone)

			services.ReloadNamed()
			c.JSON(http.StatusOK, database.DB.Records[i])
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
}

// DeleteRecord 删除记录
func (h *ZoneHandler) DeleteRecord(c *gin.Context) {
	name := c.Param("name")
	idStr := c.Param("id")
	id, _ := strconv.ParseUint(idStr, 10, 32)

	// 找到 zone
	var zone *models.Zone
	for _, z := range database.DB.Zones {
		if z.Name == name {
			zone = &z
			break
		}
	}
	
	if zone == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Zone not found"})
		return
	}

	for i, r := range database.DB.Records {
		if r.ID == uint(id) && r.ZoneID == zone.ID {
			database.DB.Records = append(database.DB.Records[:i], database.DB.Records[i+1:]...)
			
			if err := database.Save(config.DBPath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save"})
				return
			}

			// 更新区域文件
			services.UpdateZoneFile(*zone)

			services.ReloadNamed()
			c.JSON(http.StatusOK, gin.H{"message": "Record deleted"})
			return
		}
	}
	c.JSON(http.StatusNotFound, gin.H{"error": "Record not found"})
}
