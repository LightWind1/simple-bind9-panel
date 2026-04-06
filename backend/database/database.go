package database

import (
	"encoding/json"
	"os"
	"sync"

	"simple-bind9-panel/config"
	"simple-bind9-panel/models"
)

var (
	DB        *DBStore
	dataMutex sync.RWMutex
)

// DBStore 简单的文件数据库
type DBStore struct {
	Zones      []models.Zone      `json:"zones"`
	Records    []models.Record    `json:"records"`
	Backups    []models.ConfigBackup `json:"backups"`
	Forwarders []models.Forwarder `json:"forwarders"`
	Users      []models.User      `json:"users"`
}

func Init(dbPath string) {
	dataMutex.Lock()
	defer dataMutex.Unlock()
	
	DB = &DBStore{}
	
	// 确保目录存在
	os.MkdirAll(os.Getenv("HOME")+"/.simple-bind9-panel/data", 0755)
	
	// 如果数据文件存在，则加载
	if data, err := os.ReadFile(dbPath); err == nil {
		json.Unmarshal(data, DB)
	}
	
	// 初始化空切片
	if DB.Zones == nil {
		DB.Zones = []models.Zone{}
	}
	if DB.Records == nil {
		DB.Records = []models.Record{}
	}
	if DB.Backups == nil {
		DB.Backups = []models.ConfigBackup{}
	}
	if DB.Forwarders == nil {
		DB.Forwarders = []models.Forwarder{}
	}
	if DB.Users == nil {
		DB.Users = []models.User{}
	}
}

// User operations
func GetUserByID(id string) (*models.User, error) {
	dataMutex.RLock()
	defer dataMutex.RUnlock()

	for _, user := range DB.Users {
		if user.ID == id {
			return &user, nil
		}
	}
	return nil, nil
}

func GetUserByUsername(username string) (*models.User, error) {
	dataMutex.RLock()
	defer dataMutex.RUnlock()

	for _, user := range DB.Users {
		if user.Username == username {
			return &user, nil
		}
	}
	return nil, nil
}

func ListUsers() ([]models.User, error) {
	dataMutex.RLock()
	defer dataMutex.RUnlock()

	return DB.Users, nil
}

func CreateUser(user *models.User) error {
	dataMutex.Lock()
	defer dataMutex.Unlock()

	DB.Users = append(DB.Users, *user)
	return Save(config.DBPath)
}

func UpdateUser(user *models.User) error {
	dataMutex.Lock()
	defer dataMutex.Unlock()

	for i, u := range DB.Users {
		if u.ID == user.ID {
			DB.Users[i] = *user
			return Save(config.DBPath)
		}
	}
	return nil
}

func Save(dbPath string) error {
	dataMutex.Lock()
	defer dataMutex.Unlock()
	
	data, err := json.MarshalIndent(DB, "", "  ")
	if err != nil {
		return err
	}
	
	// 确保目录存在
	os.MkdirAll(os.Getenv("HOME")+"/.simple-bind9-panel/data", 0755)
	
	return os.WriteFile(dbPath, data, 0644)
}
