package models

// NamedConfig BIND9 配置结构
type NamedConfig struct {
	Version    string   `json:"version"`    // 如 "9.18"
	Options    Options  `json:"options"`    // 全局选项
	ACLs       []ACL    `json:"acls"`       // 访问控制列表
	Keys       []Key    `json:"keys"`       // TSIG 密钥
	Logging    Logging  `json:"logging"`     // 日志配置
	Views      []View   `json:"views"`      // 视图
	Zones      []Zone   `json:"zones"`      // 区域 (已在 database 中定义)
	Servers    []Server `json:"servers"`    // 服务器定义
	RawContent string   `json:"-"`           // 原始内容不返回前端
}

// Options 全局选项
type Options struct {
	Directory        string   `json:"directory"`         // 工作目录
	ListenOn        []string `json:"listen_on"`        // 监听地址
	ListenOnV6      []string `json:"listen_on_v6"`    // IPv6 监听地址
	Port            int      `json:"port"`             // DNS 端口，默认 53
	QueryPort       int      `json:"query_port"`       // 查询源端口
	Recursion       bool     `json:"recursion"`        // 是否允许递归查询
	AllowQuery      []string `json:"allow_query"`      // 允许查询的客户端
	AllowRecursion  []string `json:"allow_recursion"`   // 允许递归的客户端
	AllowQueryCache []string `json:"allow_query_cache"` // 允许查询缓存的客户端
	Forwarders      []string `json:"forwarders"`       // 转发器地址
	Forward         string   `json:"forward"`          // 转发策略: first, only
	DnssecValidation bool    `json:"dnssec_validation"` // DNSSEC 验证
	DnssecEnable    bool     `json:"dnssec_enable"`     // 启用 DNSSEC
	MaxCacheSize    string   `json:"max_cache_size"`   // 最大缓存大小
	MaxCacheTTL     int      `json:"max_cache_ttl"`    // 最大缓存 TTL
	MinCacheTTL     int      `json:"min_cache_ttl"`    // 最小缓存 TTL
	MaxNCacheTTL    int      `json:"max_ncache_ttl"`   // 否定缓存 TTL
	CleaningInterval int     `json:"cleaning_interval"` // 清理间隔(分钟)
	PidFile        string   `json:"pid_file"`         // PID 文件
	SessionKeyFile string   `json:"session_key_file"` // 会话密钥文件
	DumpFile       string   `json:"dump_file"`        // 转储文件
	StatisticsFile string   `json:"statistics_file"` // 统计文件
	MemStatistics  bool     `json:"mem_statistics"`   // 内存统计
	HostName       string   `json:"hostname"`         // 服务器主机名
	ServerID       string   `json:"server_id"`        // 服务器 ID
	Version        string   `json:"version_string"`    // 版本字符串
	InterfaceInterval int   `json:"interface_interval"` // 接口扫描间隔(分钟)
	MatchRecursiveEnough string `json:"match_recursive_enough"` // 递归匹配阈值
}

// ACL 访问控制列表
type ACL struct {
	Name  string   `json:"name"`  // ACL 名称
	Values []string `json:"values"` // ACL 值列表 (IP, CIDR, 网段等)
}

// Key TSIG 密钥
type Key struct {
	Name      string `json:"name"`       // 密钥名称
	Algorithm string `json:"algorithm"` // 算法: hmac-sha256, hmac-sha1
	Secret    string `json:"secret"`    // 密钥内容
}

// Logging 日志配置
type Logging struct {
	Channel string   `json:"channel"`      // 日志通道名称
	Category string  `json:"category"`     // 日志类别
	Severity  string `json:"severity"`     // 日志级别: critical, error, warning, notice, info, debug
	PrintTime   bool `json:"print_time"`   // 是否打印时间
	PrintCategory bool `json:"print_category"` // 是否打印类别
	PrintSeverity bool `json:"print_severity"` // 是否打印严重级别
}

// Server 服务器定义
type Server struct {
	Address       string `json:"address"`        // 服务器地址
	Bogus         bool  `json:"bogus"`          // 是否 bogus
	SupportErr    bool  `json:"support_err"`   // 支持错误
	Provider      string `json:"provider"`      // 提供者
	Keys          string `json:"keys"`          // 关联的密钥
}

// View 视图
type View struct {
	Name           string   `json:"name"`            // 视图名称
	MatchClients   []string `json:"match_clients"`  // 匹配的客户端
	MatchDestinations []string `json:"match_destinations"` // 匹配的目的地
	MatchRecursiveOnly bool   `json:"match_recursive_only"` // 仅匹配递归查询
	Recursion      bool     `json:"recursion"`       // 是否允许递归
	Zones          []Zone   `json:"zones"`           // 视图中的区域
}
