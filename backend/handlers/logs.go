package handlers

import (
	"fmt"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// LogHandler 日志处理器
type LogHandler struct{}

func NewLogHandler() *LogHandler {
	return &LogHandler{}
}

// LogEntry 日志条目
type LogEntry struct {
	Timestamp string `json:"timestamp"`
	Priority  string `json:"priority"`
	Message   string `json:"message"`
}

// GetLogs 获取日志
func (h *LogHandler) GetLogs(c *gin.Context) {
	// 获取查询参数
	lines := c.DefaultQuery("lines", "100")
	filter := c.Query("filter")

	// 转换为整数
	linesInt, err := strconv.Atoi(lines)
	if err != nil || linesInt <= 0 {
		linesInt = 100
	}
	if linesInt > 1000 {
		linesInt = 1000
	}

	// 使用 journalctl 获取 named 日志
	cmdArgs := []string{"-u", "named", "-n", strconv.Itoa(linesInt), "--no-pager", "--output=short-iso"}

	// 如果有过滤条件
	if filter != "" {
		cmdArgs = append(cmdArgs, "-g", filter)
	}

	cmd := exec.Command("journalctl", cmdArgs...)
	output, err := cmd.Output()
	if err != nil {
		// 如果 journalctl 失败，尝试读取 syslog
		h.getSyslogLogs(linesInt, filter, c)
		return
	}

	logs := parseJournalLogs(string(output))
	c.JSON(http.StatusOK, gin.H{
		"logs":  logs,
		"count": len(logs),
	})
}

// getSyslogLogs 从 syslog 获取日志
func (h *LogHandler) getSyslogLogs(lines int, filter string, c *gin.Context) {
	// 尝试多个日志源
	logFiles := []string{
		"/var/log/supervisor/named-stdout.log",
		"/var/log/supervisor/named-stderr.log",
		"/var/log/named/query.log",
		"/var/log/named/default.log",
	}

	for _, logFile := range logFiles {
		cmd := exec.Command("tail", "-n", strconv.Itoa(lines), logFile)
		output, err := cmd.Output()
		if err != nil {
			continue
		}
		if len(output) > 0 {
			logs := parseGenericLogs(string(output), filter)
			c.JSON(http.StatusOK, gin.H{
				"logs":  logs,
				"count": len(logs),
			})
			return
		}
	}

	// 所有日志源都失败
	c.JSON(http.StatusOK, gin.H{
		"logs":  []LogEntry{},
		"count": 0,
		"error": "无法读取日志文件",
	})
}

// parseJournalLogs 解析 journalctl 输出
func parseJournalLogs(output string) []LogEntry {
	var logs []LogEntry
	lines := strings.Split(output, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		
		// journalctl 输出格式: 时间 PRIORITY 消息
		parts := strings.SplitN(line, " ", 3)
		if len(parts) >= 3 {
			logs = append(logs, LogEntry{
				Timestamp: parts[0],
				Priority:  parts[1],
				Message:   parts[2],
			})
		} else if len(parts) >= 2 {
			logs = append(logs, LogEntry{
				Timestamp: parts[0],
				Priority:  "info",
				Message:   parts[1],
			})
		}
	}
	
	return logs
}

// parseSyslogLogs 解析 syslog 输出
func parseSyslogLogs(output, filter string) []LogEntry {
	var logs []LogEntry
	lines := strings.Split(output, "\n")
	
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		
		// 过滤 named 相关日志
		if !strings.Contains(line, "named") && !strings.Contains(line, "BIND") && !strings.Contains(line, "dns") {
			continue
		}
		
		// 应用过滤器
		if filter != "" && !strings.Contains(strings.ToLower(line), strings.ToLower(filter)) {
			continue
		}
		
		// 解析时间戳 (格式: "月 日 时:分:秒")
		now := time.Now()
		year := now.Year()
		
		// 尝试解析时间
		ts := fmt.Sprintf("%d-%s", year, line[:15])
		t, err := time.Parse("2006-Jan-02 15:04:05", ts)
		if err != nil {
			t = now
		}
		
		// 提取消息内容 (通常在进程名之后)
		parts := strings.SplitN(line, ": ", 4)
		var msg string
		if len(parts) >= 4 {
			msg = parts[3]
		} else if len(parts) >= 3 {
			msg = parts[2]
		} else {
			msg = line
		}
		
		logs = append(logs, LogEntry{
			Timestamp: t.Format("2006-01-02 15:04:05"),
			Priority:  getPriorityFromLine(line),
			Message:   msg,
		})
	}
	
	return logs
}

// getPriorityFromLine 从日志行获取优先级
func getPriorityFromLine(line string) string {
	if strings.Contains(line, "error") || strings.Contains(line, "Error") || strings.Contains(line, "ERROR") {
		return "error"
	}
	if strings.Contains(line, "warning") || strings.Contains(line, "Warning") || strings.Contains(line, "WARN") {
		return "warning"
	}
	if strings.Contains(line, "info") || strings.Contains(line, "Info") || strings.Contains(line, "INFO") {
		return "info"
	}
	return "debug"
}

// parseGenericLogs 解析通用日志格式
func parseGenericLogs(output, filter string) []LogEntry {
	var logs []LogEntry
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// 应用过滤器
		if filter != "" && !strings.Contains(strings.ToLower(line), strings.ToLower(filter)) {
			continue
		}

		// 解析时间戳 - 多种格式支持
		t := time.Now()
		priority := getPriorityFromLine(line)
		message := line

		// 尝试解析 ISO 时间格式 (2026-04-11T03:15:00)
		if len(line) > 19 && line[4] == '-' && line[7] == '-' {
			parsed, err := time.Parse("2006-01-02T15:04:05", line[:19])
			if err == nil {
				t = parsed
				message = line[19:]
				if len(message) > 0 && (message[0] == ' ' || message[0] == '-' || message[0] == ':') {
					message = strings.TrimLeft(message[:min(len(message), 200)], " -:")
				}
			}
		}

		// 尝试解析 syslog 格式 (Apr 11 03:15:00)
		if len(line) > 15 && line[3] == ' ' {
			year := time.Now().Year()
			ts := fmt.Sprintf("%d-%s", year, line[:15])
			parsed, err := time.Parse("2006-Jan-02 15:04:05", ts)
			if err == nil {
				t = parsed
				// 找到消息开始的位置
				idx := strings.Index(line, ": ")
				if idx > 0 && idx < len(line)-2 {
					message = line[idx+2:]
				} else if idx := strings.Index(line, " "); idx > 0 && idx < len(line)-1 {
					message = line[idx+1:]
				}
			}
		}

		logs = append(logs, LogEntry{
			Timestamp: t.Format("2006-01-02 15:04:05"),
			Priority:  priority,
			Message:   message,
		})
	}

	return logs
}