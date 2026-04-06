package services

import (
	"bufio"
	"fmt"
	"os"
	"regexp"
	"strings"

	"simple-bind9-panel/models"
)

// ParseNamedConf 解析 named.conf 文件
func ParseNamedConf(path string) (*models.NamedConfig, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	config := &models.NamedConfig{
		Options: models.Options{
			Port:      53,
			Recursion: true,
			DnssecValidation: true,
			DnssecEnable: true,
			MaxCacheTTL: 604800,
			MinCacheTTL: 0,
			MaxNCacheTTL: 10800,
			CleaningInterval: 60,
			InterfaceInterval: 60,
		},
	}

	scanner := bufio.NewScanner(strings.NewReader(string(content)))
	var currentSection string
	var braceCount int
	var blockContent []string

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		
		// 跳过空行和注释
		if line == "" || strings.HasPrefix(line, "//") || strings.HasPrefix(line, "#") {
			continue
		}

		// 统计大括号
		braceCount += strings.Count(line, "{") - strings.Count(line, "}")
		
		// 收集块内容
		if currentSection != "" {
			blockContent = append(blockContent, line)
			if braceCount <= 0 {
				// 块结束，处理块
				processBlock(currentSection, blockContent, config)
				currentSection = ""
				blockContent = nil
			}
			continue
		}

		// 检查语句结束
		semicolonCount := strings.Count(line, ";")
		isBlockStart := strings.Contains(line, "{")
		isBlockEnd := strings.Contains(line, "}")
		
		// 收集非块语句内容
		if semicolonCount > 0 && !isBlockStart && !isBlockEnd {
			processStatement(line, config)
		} else if isBlockStart {
			// 开始一个新块
			currentSection = extractStatementName(line)
			braceCount = strings.Count(line, "{") - strings.Count(line, "}")
			blockContent = append(blockContent, line)
		}
	}

	return config, nil
}

// processStatement 处理单行语句
func processStatement(line string, config *models.NamedConfig) {
	// 移除末尾分号
	line = strings.TrimSuffix(line, ";")
	
	parts := strings.Fields(line)
	if len(parts) < 2 {
		return
	}

	stmt := strings.ToLower(parts[0])

	switch stmt {
	case "include":
		// 跳过 include 语句
	case "key":
		processKeyStatement(parts[1:], config)
	case "logging":
		// logging 是一个块，在 processBlock 中处理
	case "options":
		// options 是一个块，在 processBlock 中处理
	case "acl":
		processACLStatement(parts[1:], config)
	case "zone":
		// zone 在 zone handler 中处理
	case "server":
		processServerStatement(parts[1:], config)
	}
}

// processBlock 处理块语句
func processBlock(stmtType string, lines []string, config *models.NamedConfig) {
	content := strings.Join(lines, "\n")
	
	switch strings.ToLower(stmtType) {
	case "options":
		parseOptionsBlock(content, config)
	case "logging":
		parseLoggingBlock(content, config)
	case "key":
		parseKeyBlock(content, config)
	case "acl":
		parseACLBlock(content, config)
	case "server":
		parseServerBlock(content, config)
	}
}

// parseOptionsBlock 解析 options 块
func parseOptionsBlock(content string, config *models.NamedConfig) {
	opts := &config.Options
	
	// 使用正则提取各种选项
	extractStringOpt(content, `directory\s+"(.*?)"`, &opts.Directory)
	extractBoolOpt(content, `recursion\s+(yes|no)`, &opts.Recursion)
	extractBoolOpt(content, `dnssec-validation\s+(yes|no)`, &opts.DnssecValidation)
	extractBoolOpt(content, `dnssec-enable\s+(yes|no)`, &opts.DnssecEnable)
	extractIntOpt(content, `port\s+(\d+)`, &opts.Port)
	extractIntOpt(content, `query-port\s+(\d+)`, &opts.QueryPort)
	extractStringOpt(content, `forward\s+(first|only)`, &opts.Forward)
	extractStringOpt(content, `pid-file\s+"(.*?)"`, &opts.PidFile)
	extractStringOpt(content, `hostname\s+"(.*?)"`, &opts.HostName)
	extractStringOpt(content, `server-id\s+"(.*?)"`, &opts.ServerID)
	extractStringOpt(content, `version\s+"(.*?)"`, &opts.Version)
	extractStringOpt(content, `max-cache-size\s+(.*?);`, &opts.MaxCacheSize)
	extractIntOpt(content, `max-cache-ttl\s+(\d+)`, &opts.MaxCacheTTL)
	extractIntOpt(content, `min-cache-ttl\s+(\d+)`, &opts.MinCacheTTL)
	extractIntOpt(content, `max-ncache-ttl\s+(\d+)`, &opts.MaxNCacheTTL)
	extractIntOpt(content, `cleaning-interval\s+(\d+)`, &opts.CleaningInterval)
	extractIntOpt(content, `interface-interval\s+(\d+)`, &opts.InterfaceInterval)
	extractBoolOpt(content, `memstatistics\s+(yes|no)`, &opts.MemStatistics)
	
	// 提取 listen-on
	listenOnRe := regexp.MustCompile(`listen-on\s+([^;]+);`)
	if matches := listenOnRe.FindStringSubmatch(content); len(matches) > 1 {
		ports := extractPortFromAddressList(matches[1])
		opts.ListenOn = ports
	}
	
	// 提取 allow-query
	allowQueryRe := regexp.MustCompile(`allow-query\s+([^;]+);`)
	if matches := allowQueryRe.FindStringSubmatch(content); len(matches) > 1 {
		opts.AllowQuery = extractACLFromAddressList(matches[1])
	}
	
	// 提取 allow-recursion
	allowRecursionRe := regexp.MustCompile(`allow-recursion\s+([^;]+);`)
	if matches := allowRecursionRe.FindStringSubmatch(content); len(matches) > 1 {
		opts.AllowRecursion = extractACLFromAddressList(matches[1])
	}
	
	// 提取 allow-query-cache
	allowQueryCacheRe := regexp.MustCompile(`allow-query-cache\s+([^;]+);`)
	if matches := allowQueryCacheRe.FindStringSubmatch(content); len(matches) > 1 {
		opts.AllowQueryCache = extractACLFromAddressList(matches[1])
	}
	
	// 提取 forwarders
	forwardersRe := regexp.MustCompile(`forwarders\s+{([^}]+)}`)
	if matches := forwardersRe.FindStringSubmatch(content); len(matches) > 1 {
		opts.Forwarders = extractIPList(matches[1])
	}
}

// parseLoggingBlock 解析 logging 块
func parseLoggingBlock(content string, config *models.NamedConfig) {
	// 简化处理，实际应该更复杂
	var logging models.Logging
	
	channelRe := regexp.MustCompile(`channel\s+(\w+)\s+{([^}]+)}`)
	for _, match := range channelRe.FindAllStringSubmatch(content, -1) {
		if len(match) > 2 {
			logging.Channel = match[1]
			// 从 channel 内容提取 severity
			severityRe := regexp.MustCompile(`severity\s+(critical|error|warning|notice|info|debug\d?);`)
			if sevMatch := severityRe.FindStringSubmatch(match[2]); len(sevMatch) > 1 {
				logging.Severity = sevMatch[1]
			}
		}
	}
	
	categoryRe := regexp.MustCompile(`category\s+(\w+)\s+{([^}]+)}`)
	for _, match := range categoryRe.FindAllStringSubmatch(content, -1) {
		if len(match) > 2 {
			logging.Category = match[1]
		}
	}
	
	config.Logging = logging
}

// parseKeyBlock 解析 key 块
func parseKeyBlock(content string, config *models.NamedConfig) {
	var key models.Key
	
	nameRe := regexp.MustCompile(`name\s+"(.*?)"`)
	if matches := nameRe.FindStringSubmatch(content); len(matches) > 1 {
		key.Name = matches[1]
	}
	
	algRe := regexp.MustCompile(`algorithm\s+"?(\w+)"?`)
	if matches := algRe.FindStringSubmatch(content); len(matches) > 1 {
		key.Algorithm = matches[1]
	}
	
	secretRe := regexp.MustCompile(`secret\s+"(.*?)"`)
	if matches := secretRe.FindStringSubmatch(content); len(matches) > 1 {
		key.Secret = matches[1]
	}
	
	if key.Name != "" {
		config.Keys = append(config.Keys, key)
	}
}

// parseACLBlock 解析 acl 块
func parseACLBlock(content string, config *models.NamedConfig) {
	var acl models.ACL
	
	// 提取 acl 名称
	nameRe := regexp.MustCompile(`acl\s+(\w+)`)
	if matches := nameRe.FindStringSubmatch(content); len(matches) > 1 {
		acl.Name = matches[1]
	}
	
	// 提取 ACL 值
	valuesRe := regexp.MustCompile(`{([^}]+)}`)
	if matches := valuesRe.FindStringSubmatch(content); len(matches) > 1 {
		acl.Values = extractACLFromAddressList(matches[1])
	}
	
	if acl.Name != "" {
		config.ACLs = append(config.ACLs, acl)
	}
}

// parseServerBlock 解析 server 块
func parseServerBlock(content string, config *models.NamedConfig) {
	var server models.Server
	
	addrRe := regexp.MustCompile(`server\s+([0-9a-f.:]+)`)
	if matches := addrRe.FindStringSubmatch(content); len(matches) > 1 {
		server.Address = matches[1]
	}
	
	bogusRe := regexp.MustCompile(`bogus\s+(yes|no)`)
	if matches := bogusRe.FindStringSubmatch(content); len(matches) > 1 {
		server.Bogus = matches[1] == "yes"
	}
	
	keysRe := regexp.MustCompile(`keys\s+"?(\w+)"?`)
	if matches := keysRe.FindStringSubmatch(content); len(matches) > 1 {
		server.Keys = matches[1]
	}
	
	if server.Address != "" {
		config.Servers = append(config.Servers, server)
	}
}

// processKeyStatement 处理 key 语句
func processKeyStatement(parts []string, config *models.NamedConfig) {
	// key "name" { ... }
	if len(parts) < 2 {
		return
	}
	var key models.Key
	key.Name = strings.Trim(parts[0], "\"")
	config.Keys = append(config.Keys, key)
}

// processACLStatement 处理 acl 语句
func processACLStatement(parts []string, config *models.NamedConfig) {
	if len(parts) < 2 {
		return
	}
	var acl models.ACL
	acl.Name = strings.Trim(parts[0], "\"")
	// ACL 值稍后在块中处理
	config.ACLs = append(config.ACLs, acl)
}

// processServerStatement 处理 server 语句
func processServerStatement(parts []string, config *models.NamedConfig) {
	if len(parts) < 1 {
		return
	}
	var server models.Server
	server.Address = parts[0]
	config.Servers = append(config.Servers, server)
}

// extractStringOpt 提取字符串选项
func extractStringOpt(content, pattern string, target *string) {
	re := regexp.MustCompile(pattern)
	if matches := re.FindStringSubmatch(content); len(matches) > 1 {
		*target = matches[1]
	}
}

// extractBoolOpt 提取布尔选项
func extractBoolOpt(content, pattern string, target *bool) {
	re := regexp.MustCompile(pattern)
	if matches := re.FindStringSubmatch(content); len(matches) > 1 {
		*target = matches[1] == "yes"
	}
}

// extractIntOpt 提取整数选项
func extractIntOpt(content, pattern string, target *int) {
	re := regexp.MustCompile(pattern)
	if matches := re.FindStringSubmatch(content); len(matches) > 1 {
		var val int
		reader := strings.NewReader(matches[1])
		if reader != nil {
			fmt.Sscanf(matches[1], "%d", &val)
			*target = val
		}
	}
}

// extractStatementName 从块语句行中提取名称（如 "zone" 从 "zone \"example.com\" {" 中提取）
func extractStatementName(line string) string {
	line = strings.TrimSpace(line)
	// 移除可能的引号和括号
	line = strings.TrimSuffix(line, "{")
	line = strings.TrimSpace(line)
	parts := strings.Fields(line)
	if len(parts) > 0 {
		return parts[0]
	}
	return ""
}

// extractPortFromAddressList 从地址列表提取端口
func extractPortFromAddressList(list string) []string {
	var result []string
	ports := regexp.MustCompile(`port\s+(\d+)`)
	for _, match := range ports.FindAllStringSubmatch(list, -1) {
		if len(match) > 1 {
			result = append(result, match[1])
		}
	}
	if len(result) == 0 {
		result = append(result, "53")
	}
	return result
}

// extractACLFromAddressList 从地址列表提取 ACL
func extractACLFromAddressList(list string) []string {
	list = strings.TrimSpace(list)
	list = strings.Trim(list, "{};")
	
	var result []string
	// 按逗号分割
	parts := strings.Split(list, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			// 移除 any, localhost, none 等
			result = append(result, part)
		}
	}
	return result
}

// extractIPList 提取 IP 列表
func extractIPList(list string) []string {
	list = strings.TrimSpace(list)
	list = strings.Trim(list, "{};")
	
	var result []string
	parts := strings.Split(list, ";")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" && !strings.Contains(part, "//") {
			result = append(result, part)
		}
	}
	return result
}

// GenerateOptionsBlock 生成 options 块内容
func GenerateOptionsBlock(opts models.Options) string {
	var sb strings.Builder

	sb.WriteString("options {\n")

	if opts.Directory != "" {
		sb.WriteString(fmt.Sprintf("\tdirectory \"%s\";\n", opts.Directory))
	}
	if len(opts.ListenOn) > 0 {
		sb.WriteString("\tlisten-on {\n")
		for _, addr := range opts.ListenOn {
			sb.WriteString(fmt.Sprintf("\t\t%s;\n", addr))
		}
		sb.WriteString("\t};\n")
	}
	if opts.Port != 53 && opts.Port != 0 {
		sb.WriteString(fmt.Sprintf("\tport %d;\n", opts.Port))
	}
	if opts.Recursion {
		sb.WriteString("\trecursion yes;\n")
	} else {
		sb.WriteString("\trecursion no;\n")
	}
	if len(opts.AllowQuery) > 0 {
		sb.WriteString("\tallow-query {\n")
		for _, acl := range opts.AllowQuery {
			sb.WriteString(fmt.Sprintf("\t\t%s;\n", acl))
		}
		sb.WriteString("\t};\n")
	}
	if len(opts.AllowRecursion) > 0 {
		sb.WriteString("\tallow-recursion {\n")
		for _, acl := range opts.AllowRecursion {
			sb.WriteString(fmt.Sprintf("\t\t%s;\n", acl))
		}
		sb.WriteString("\t};\n")
	}
	if len(opts.Forwarders) > 0 {
		sb.WriteString("\tforwarders {\n")
		for _, ip := range opts.Forwarders {
			sb.WriteString(fmt.Sprintf("\t\t%s;\n", ip))
		}
		sb.WriteString("\t};\n")
	}
	if opts.Forward != "" {
		sb.WriteString(fmt.Sprintf("\tforward %s;\n", opts.Forward))
	}
	if opts.DnssecValidation {
		sb.WriteString("\tdnssec-validation yes;\n")
	} else {
		sb.WriteString("\tdnssec-validation no;\n")
	}
	if opts.MaxCacheSize != "" {
		sb.WriteString(fmt.Sprintf("\tmax-cache-size %s;\n", opts.MaxCacheSize))
	}
	if opts.MaxCacheTTL != 0 {
		sb.WriteString(fmt.Sprintf("\tmax-cache-ttl %d;\n", opts.MaxCacheTTL))
	}
	if opts.MinCacheTTL != 0 {
		sb.WriteString(fmt.Sprintf("\tmin-cache-ttl %d;\n", opts.MinCacheTTL))
	}
	if opts.MaxNCacheTTL != 0 {
		sb.WriteString(fmt.Sprintf("\tmax-ncache-ttl %d;\n", opts.MaxNCacheTTL))
	}
	if opts.CleaningInterval != 0 {
		sb.WriteString(fmt.Sprintf("\tcleaning-interval %d;\n", opts.CleaningInterval))
	}
	if opts.InterfaceInterval != 0 {
		sb.WriteString(fmt.Sprintf("\tinterface-interval %d;\n", opts.InterfaceInterval))
	}
	if opts.PidFile != "" {
		sb.WriteString(fmt.Sprintf("\tpid-file \"%s\";\n", opts.PidFile))
	}
	if opts.HostName != "" {
		sb.WriteString(fmt.Sprintf("\thostname \"%s\";\n", opts.HostName))
	}
	if opts.ServerID != "" {
		sb.WriteString(fmt.Sprintf("\tserver-id \"%s\";\n", opts.ServerID))
	}
	if opts.Version != "" {
		sb.WriteString(fmt.Sprintf("\tversion \"%s\";\n", opts.Version))
	}
	if opts.MemStatistics {
		sb.WriteString("\tmemstatistics yes;\n")
	}

	sb.WriteString("};\n")

	return sb.String()
}

// ReplaceOptionsBlock 替换 named.conf 中的 options 块
func ReplaceOptionsBlock(content string, newOptions string) string {
	// 简单的块替换：找到 options { ... } 块并替换
	re := regexp.MustCompile(`(?s)options\s*\{[^}]*\}[^;]*;`)
	return re.ReplaceAllString(content, newOptions)
}
