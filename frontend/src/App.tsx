import { useState, useEffect, CSSProperties } from 'react'

const API_BASE = '/api'

const inputStyle: CSSProperties = {
  padding: '8px 12px',
  borderRadius: 6,
  border: '1px solid #30363d',
  background: '#0d1117',
  color: '#c9d1d9',
  fontSize: 14,
}

interface ServerStatus {
  running: boolean
  version: string
  uptime: string
  queries: number
  zone_count: number
  record_count: number
}

interface Zone {
  id: number
  name: string
  type: string
  file: string
}

interface Forwarder {
  id: number
  name: string
  servers: string
  domains: string
  enabled: boolean
}

interface DnsRecord {
  id: number
  zone_id: number
  name: string
  type: string
  ttl: number
  priority: number
  value: string
  enabled: boolean
}

function App() {
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'zones' | 'forwarders' | 'config' | 'logs'>('dashboard')
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [zones, setZones] = useState<Zone[]>([])
  const [forwarders, setForwarders] = useState<Forwarder[]>([])
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<{timestamp: string, priority: string, message: string}[]>([])
  const [logFilter, setLogFilter] = useState('')
  const [logLines, setLogLines] = useState('100')
  const [, setEditingZone] = useState<Zone | null>(null)
  const [showAddZone, setShowAddZone] = useState(false)
  const [showAddForwarder, setShowAddForwarder] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneType, setNewZoneType] = useState('master')
  const [newZoneFile, setNewZoneFile] = useState('')
  const [newForwarderName, setNewForwarderName] = useState('')
  const [newForwarderServers, setNewForwarderServers] = useState('')
  const [newForwarderDomains, setNewForwarderDomains] = useState('')
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [, setEditingRecord] = useState<DnsRecord | null>(null)
  const [newRecordName, setNewRecordName] = useState('')
  const [newRecordType, setNewRecordType] = useState('A')
  const [newRecordTTL, setNewRecordTTL] = useState('3600')
  const [newRecordPriority, setNewRecordPriority] = useState('')
  const [newRecordValue, setNewRecordValue] = useState('')
  const [expandedZones, setExpandedZones] = useState<number[]>([])
  const [configData, setConfigData] = useState<any>(null)
  const [rawConfig, setRawConfig] = useState('')

  // Auth state
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  // Check auth status on mount
  useEffect(() => {
    if (token) {
      loadStatus()
    }
  }, [])

  // API helper with auth
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      setToken(null)
      localStorage.removeItem('token')
      throw new Error('Unauthorized')
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Request failed')
    }
    return res.json()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || 'Login failed')
        return
      }
      setToken(data.access_token)
      localStorage.setItem('token', data.access_token)
      loadStatus()
    } catch (e: any) {
      setLoginError(e.message || 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    setToken(null)
    localStorage.removeItem('token')
    setStatus(null)
    setZones([])
    setForwarders([])
  }

  const loadStatus = async () => {
    try {
      const data = await apiFetch(`${API_BASE}/status`)
      setStatus(data)
    } catch (e) {
      console.error('Failed to load status:', e)
    }
  }

  useEffect(() => {
    if (token) {
      if (currentTab === 'dashboard') {
        loadStatus()
      } else if (currentTab === 'zones') {
        loadZones()
      } else if (currentTab === 'forwarders') {
        loadForwarders()
      } else if (currentTab === 'logs') {
        loadLogs()
      } else if (currentTab === 'config') {
        loadConfig()
      }
    }
  }, [currentTab, token])

  useEffect(() => {
    if (currentTab === 'zones') {
      loadZones()
    } else if (currentTab === 'forwarders') {
      loadForwarders()
    }
  }, [currentTab])

  const loadZones = async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`${API_BASE}/zones`)
      setZones(data)
    } catch (e: any) {
      if (e.message === 'Unauthorized') {
        setToken(null)
        localStorage.removeItem('token')
      }
      console.error('Failed to load zones:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async (zoneName: string) => {
    setLoading(true)
    try {
      const data = await apiFetch(`${API_BASE}/zones/${zoneName}/records`)
      setRecords(data)
    } catch (e: any) {
      if (e.message === 'Unauthorized') {
        setToken(null)
        localStorage.removeItem('token')
      }
      console.error('Failed to load records:', e)
    } finally {
      setLoading(false)
    }
  }

  const selectZone = (zone: Zone) => {
    setSelectedZone(zone)
    loadRecords(zone.name)
  }

  const loadForwarders = async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`${API_BASE}/forwarders`)
      setForwarders(data)
    } catch (e: any) {
      if (e.message === 'Unauthorized') {
        setToken(null)
        localStorage.removeItem('token')
      }
      console.error('Failed to load forwarders:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ lines: logLines })
      if (logFilter) params.append('filter', logFilter)
      const data = await apiFetch(`${API_BASE}/logs?${params}`)
      setLogs(data)
    } catch (e: any) {
      if (e.message === 'Unauthorized') {
        setToken(null)
        localStorage.removeItem('token')
      }
      console.error('Failed to load logs:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`${API_BASE}/config`)
      setConfigData(data)
    } catch (e: any) {
      if (e.message === 'Unauthorized') {
        setToken(null)
        localStorage.removeItem('token')
      }
      console.error('Failed to load config:', e)
    } finally {
      setLoading(false)
    }
  }

  const deleteZone = async (name: string) => {
    try {
      await apiFetch(`${API_BASE}/zones/${name}`, { method: 'DELETE' })
      loadZones()
    } catch (e) {
      alert('删除区域失败')
    }
  }

  const deleteRecord = async (zoneName: string, id: number) => {
    try {
      await apiFetch(`${API_BASE}/zones/${zoneName}/records/${id}`, { method: 'DELETE' })
      loadRecords(zoneName)
    } catch (e) {
      alert('删除记录失败')
    }
  }

  const addZone = async () => {
    if (!newZoneName) return
    try {
      await apiFetch(`${API_BASE}/zones`, {
        method: 'POST',
        body: JSON.stringify({
          name: newZoneName,
          type: newZoneType,
          file: newZoneFile || undefined,
        }),
      })
      setShowAddZone(false)
      setNewZoneName('')
      setNewZoneType('master')
      setNewZoneFile('')
      loadZones()
    } catch (e) {
      alert('添加区域失败')
    }
  }

  const addForwarder = async () => {
    if (!newForwarderName || !newForwarderServers) return
    try {
      await apiFetch(`${API_BASE}/forwarders`, {
        method: 'POST',
        body: JSON.stringify({
          name: newForwarderName,
          servers: newForwarderServers,
          domains: newForwarderDomains,
          enabled: true,
        }),
      })
      setShowAddForwarder(false)
      setNewForwarderName('')
      setNewForwarderServers('')
      setNewForwarderDomains('')
      loadForwarders()
    } catch (e) {
      alert('添加转发器失败')
    }
  }

  const addRecord = async () => {
    if (!selectedZone) return
    try {
      await apiFetch(`${API_BASE}/zones/${selectedZone.name}/records`, {
        method: 'POST',
        body: JSON.stringify({
          name: newRecordName,
          type: newRecordType,
          ttl: parseInt(newRecordTTL) || 3600,
          priority: parseInt(newRecordPriority) || 0,
          value: newRecordValue,
        }),
      })
      setShowAddRecord(false)
      setNewRecordName('')
      setNewRecordType('A')
      setNewRecordTTL('3600')
      setNewRecordPriority('')
      setNewRecordValue('')
      loadRecords(selectedZone.name)
    } catch (e) {
      alert('添加记录失败')
    }
  }

  const toggleZoneExpand = (id: number) => {
    setExpandedZones(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const restartServer = async () => {
    if (!confirm('确定要重启 BIND9 服务吗？')) return
    try {
      await apiFetch(`${API_BASE}/server/restart`, { method: 'POST' })
      alert('服务重启请求已发送')
    } catch (e) {
      alert('重启失败')
    }
  }

  const reloadServer = async () => {
    if (!confirm('确定要重载 BIND9 配置吗？')) return
    try {
      await apiFetch(`${API_BASE}/server/reload`, { method: 'POST' })
      alert('配置重载请求已发送')
    } catch (e) {
      alert('重载失败')
    }
  }

  // Login screen
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0d1117',
        color: '#c9d1d9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      }}>
        <div style={{
          width: 360,
          padding: 32,
          borderRadius: 12,
          background: '#161b22',
          border: '1px solid #30363d',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <h2 style={{ margin: '0 0 8px 0', textAlign: 'center', color: '#58a6ff' }}>BIND9 Panel</h2>
          <p style={{ margin: '0 0 24px 0', textAlign: 'center', color: '#8b949e', fontSize: 14 }}>请登录以继续</p>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#c9d1d9' }}>用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                placeholder="admin"
                required
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#c9d1d9' }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && (
              <div style={{ marginBottom: 16, padding: '8px 12px', background: '#f8514966', borderRadius: 6, color: '#f85149', fontSize: 14 }}>
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: isLoggingIn ? '#58a6ff80' : '#58a6ff',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoggingIn ? '登录中...' : '登录'}
            </button>
          </form>
          <p style={{ marginTop: 24, textAlign: 'center', color: '#8b949e', fontSize: 12 }}>
            默认账号: admin / admin
          </p>
        </div>
      </div>
    )
  }

  // Main app
  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      {/* Header */}
      <header style={{
        padding: '12px 24px',
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: 18, color: '#58a6ff' }}>🛠️ BIND9 Panel</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#8b949e' }}>admin</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #30363d',
              background: 'transparent',
              color: '#c9d1d9',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            退出
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{
        padding: '0 24px',
        background: '#161b22',
        borderBottom: '1px solid #30363d',
        display: 'flex',
        gap: 4,
      }}>
        {(['dashboard', 'zones', 'forwarders', 'config', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setCurrentTab(tab)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: currentTab === tab ? '#58a6ff' : '#8b949e',
              fontSize: 14,
              cursor: 'pointer',
              borderBottom: currentTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
            }}
          >
            {tab === 'dashboard' && '📊 '}
            {tab === 'zones' && '🌐 '}
            {tab === 'forwarders' && '🔄 '}
            {tab === 'config' && '⚙️ '}
            {tab === 'logs' && '📜 '}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main style={{ padding: 24 }}>
        {/* Dashboard */}
        {currentTab === 'dashboard' && status && (
          <div>
            <h2 style={{ margin: '0 0 24px 0', fontSize: 24 }}>服务状态</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{status.running ? '✅' : '❌'}</div>
                <div style={{ fontSize: 14, color: '#8b949e' }}>运行状态</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{status.running ? '运行中' : '已停止'}</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                <div style={{ fontSize: 14, color: '#8b949e' }}>BIND9 版本</div>
                <div style={{ fontSize: 14, wordBreak: 'break-all' }}>{status.version}</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🌍</div>
                <div style={{ fontSize: 14, color: '#8b949e' }}>区域数量</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{status.zone_count}</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                <div style={{ fontSize: 14, color: '#8b949e' }}>记录数量</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{status.record_count}</div>
              </div>
            </div>
            <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={restartServer}>🔄 重启服务</button>
              <button className="btn" onClick={reloadServer}>📥 重载配置</button>
            </div>
          </div>
        )}

        {/* Zones */}
        {currentTab === 'zones' && (
          <div>
            <div className="content-header" style={{ marginBottom: 24 }}>
              <h2 style={{ margin: 0 }}>🌐 DNS 区域管理</h2>
              <button className="btn btn-primary" onClick={() => setShowAddZone(true)}>➕ 添加区域</button>
            </div>

            {showAddZone && (
              <div className="card" style={{ marginBottom: 24 }}>
                <h4>添加新区域</h4>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
                  <input
                    type="text"
                    placeholder="区域名称 (如: example.com)"
                    value={newZoneName}
                    onChange={e => setNewZoneName(e.target.value)}
                    style={{ ...inputStyle, width: 200 }}
                  />
                  <select value={newZoneType} onChange={e => setNewZoneType(e.target.value)} style={{ ...inputStyle, width: 120 }}>
                    <option value="master">Master</option>
                    <option value="slave">Slave</option>
                    <option value="forward">Forward</option>
                  </select>
                  <input
                    type="text"
                    placeholder="区域文件 (可选)"
                    value={newZoneFile}
                    onChange={e => setNewZoneFile(e.target.value)}
                    style={{ ...inputStyle, width: 200 }}
                  />
                  <button className="btn btn-primary" onClick={addZone}>确认添加</button>
                  <button className="btn" onClick={() => setShowAddZone(false)}>取消</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading">加载中...</div>
            ) : zones.length === 0 ? (
              <div className="empty-state">
                <p>暂无区域配置</p>
              </div>
            ) : !selectedZone ? (
              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>域名</th>
                      <th>类型</th>
                      <th>区域文件</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map(zone => (
                      <tr key={zone.id}>
                        <td><strong>{zone.name}</strong></td>
                        <td>{zone.type}</td>
                        <td>{zone.file}</td>
                        <td style={{textAlign: 'right', whiteSpace: 'nowrap'}}>
                          <span style={{display: 'inline-flex', gap: 4, alignItems: 'center'}}>
                            <button className="btn btn-small" onClick={() => selectZone(zone)}>📋 记录</button>
                            <button className="btn btn-small" onClick={() => setEditingZone(zone)}>⚙️ 设置</button>
                            <button
                              className="btn btn-small"
                              onClick={() => toggleZoneExpand(zone.id)}
                              title={expandedZones.includes(zone.id) ? '收起' : '更多操作'}
                            >
                              {expandedZones.includes(zone.id) ? '▲' : '▼'}
                            </button>
                          </span>
                          {expandedZones.includes(zone.id) && (
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => {
                                if (confirm(`确定要删除区域 "${zone.name}" 吗？`)) {
                                  deleteZone(zone.name)
                                }
                              }}
                              style={{marginLeft: 8}}
                            >
                              🗑️
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div>
                <div className="card" style={{marginBottom: 16}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <h3 style={{margin: 0}}>区域: {selectedZone.name}</h3>
                      <p style={{margin: '8px 0 0 0', color: '#8b949e', fontSize: 12}}>类型: {selectedZone.type} | 文件: {selectedZone.file}</p>
                    </div>
                    <div>
                      <button className="btn" onClick={() => setSelectedZone(null)}>← 返回区域列表</button>
                    </div>
                  </div>
                </div>

                <div className="content-header" style={{marginBottom: 16}}>
                  <h3>DNS 记录</h3>
                  <button className="btn btn-primary" onClick={() => setShowAddRecord(true)}>➕ 添加记录</button>
                </div>

                {showAddRecord && (
                  <div className="card" style={{marginBottom: 16}}>
                    <h4>添加 DNS 记录</h4>
                    <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12}}>
                      <input
                        type="text"
                        placeholder="记录名称 (如: www)"
                        value={newRecordName}
                        onChange={e => setNewRecordName(e.target.value)}
                        style={inputStyle}
                      />
                      <select value={newRecordType} onChange={e => setNewRecordType(e.target.value)} style={inputStyle}>
                        <option value="A">A</option>
                        <option value="AAAA">AAAA</option>
                        <option value="CNAME">CNAME</option>
                        <option value="MX">MX</option>
                        <option value="TXT">TXT</option>
                        <option value="NS">NS</option>
                      </select>
                      <input
                        type="text"
                        placeholder="TTL (默认3600)"
                        value={newRecordTTL}
                        onChange={e => setNewRecordTTL(e.target.value)}
                        style={{...inputStyle, width: 100}}
                      />
                      {newRecordType === 'MX' && (
                        <input
                          type="text"
                          placeholder="优先级"
                          value={newRecordPriority}
                          onChange={e => setNewRecordPriority(e.target.value)}
                          style={{...inputStyle, width: 80}}
                        />
                      )}
                      <input
                        type="text"
                        placeholder="记录值"
                        value={newRecordValue}
                        onChange={e => setNewRecordValue(e.target.value)}
                        style={{...inputStyle, flex: 1, minWidth: 200}}
                      />
                      <button className="btn btn-primary" onClick={addRecord}>确认</button>
                      <button className="btn" onClick={() => setShowAddRecord(false)}>取消</button>
                    </div>
                  </div>
                )}

                {records.length === 0 ? (
                  <div className="empty-state">
                    <p>暂无记录</p>
                  </div>
                ) : (
                  <div className="card">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>名称</th>
                          <th>类型</th>
                          <th>TTL</th>
                          <th>优先级</th>
                          <th>值</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(record => (
                          <tr key={record.id}>
                            <td><strong>{record.name}</strong></td>
                            <td><span className="badge">{record.type}</span></td>
                            <td>{record.ttl}</td>
                            <td>{record.priority || '-'}</td>
                            <td style={{wordBreak: 'break-all'}}>{record.value}</td>
                            <td>
                              <button className="btn btn-small" onClick={() => setEditingRecord(record)}>✏️</button>
                              <button className="btn btn-small btn-danger" onClick={() => {
                                if (confirm('确定要删除这条记录吗？')) {
                                  deleteRecord(selectedZone.name, record.id)
                                }
                              }}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Forwarders */}
        {currentTab === 'forwarders' && (
          <div>
            <div className="content-header" style={{marginBottom: 24}}>
              <h2 style={{margin: 0}}>🔄 DNS 转发器</h2>
              <button className="btn btn-primary" onClick={() => setShowAddForwarder(true)}>➕ 添加转发器</button>
            </div>

            {showAddForwarder && (
              <div className="card" style={{marginBottom: 24}}>
                <h4>添加转发器</h4>
                <div style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12}}>
                  <input
                    type="text"
                    placeholder="名称"
                    value={newForwarderName}
                    onChange={e => setNewForwarderName(e.target.value)}
                    style={{...inputStyle, width: 150}}
                  />
                  <input
                    type="text"
                    placeholder="DNS服务器 (如: 8.8.8.8,1.1.1.1)"
                    value={newForwarderServers}
                    onChange={e => setNewForwarderServers(e.target.value)}
                    style={{...inputStyle, width: 250}}
                  />
                  <input
                    type="text"
                    placeholder="域名 (可选，留空为全局)"
                    value={newForwarderDomains}
                    onChange={e => setNewForwarderDomains(e.target.value)}
                    style={{...inputStyle, width: 200}}
                  />
                  <button className="btn btn-primary" onClick={addForwarder}>确认</button>
                  <button className="btn" onClick={() => setShowAddForwarder(false)}>取消</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading">加载中...</div>
            ) : forwarders.length === 0 ? (
              <div className="empty-state">
                <p>暂无转发器配置</p>
              </div>
            ) : (
              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>DNS 服务器</th>
                      <th>域名</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forwarders.map(f => (
                      <tr key={f.id}>
                        <td><strong>{f.name}</strong></td>
                        <td>{f.servers}</td>
                        <td>{f.domains || '全局'}</td>
                        <td>
                          <span className={`badge ${f.enabled ? 'badge-success' : ''}`}>
                            {f.enabled ? '启用' : '禁用'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-small btn-danger" onClick={async () => {
                            if (confirm('确定要删除这个转发器吗？')) {
                              try {
                                await apiFetch(`${API_BASE}/forwarders/${f.id}`, { method: 'DELETE' })
                                loadForwarders()
                              } catch (e) {
                                alert('删除失败')
                              }
                            }
                          }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Config */}
        {currentTab === 'config' && (
          <div>
            <div className="content-header" style={{marginBottom: 24}}>
              <h2 style={{margin: 0}}>⚙️ BIND9 配置</h2>
            </div>
            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div className="card">
                <textarea
                  value={rawConfig || JSON.stringify(configData, null, 2)}
                  onChange={e => setRawConfig(e.target.value)}
                  style={{
                    ...inputStyle,
                    width: '100%',
                    minHeight: 400,
                    fontFamily: 'monospace',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
                <div style={{marginTop: 16, display: 'flex', gap: 12}}>
                  <button className="btn btn-primary" onClick={async () => {
                    try {
                      await apiFetch(`${API_BASE}/config`, {
                        method: 'PUT',
                        body: JSON.stringify(JSON.parse(rawConfig)),
                      })
                      alert('配置已保存')
                    } catch (e) {
                      alert('保存失败: ' + e)
                    }
                  }}>💾 保存配置</button>
                  <button className="btn" onClick={() => {
                    apiFetch(`${API_BASE}/config/validate`, { method: 'POST' })
                      .then(() => alert('配置有效'))
                      .catch(e => alert('配置无效: ' + e))
                  }}>✓ 验证配置</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs */}
        {currentTab === 'logs' && (
          <div>
            <div className="content-header" style={{marginBottom: 24}}>
              <h2 style={{margin: 0}}>📜 查询日志</h2>
            </div>
            <div className="card" style={{marginBottom: 16}}>
              <div style={{display: 'flex', gap: 12}}>
                <input
                  type="text"
                  placeholder="过滤关键词"
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value)}
                  style={{...inputStyle, width: 200}}
                />
                <input
                  type="number"
                  placeholder="行数"
                  value={logLines}
                  onChange={e => setLogLines(e.target.value)}
                  style={{...inputStyle, width: 80}}
                />
                <button className="btn" onClick={loadLogs}>🔍 刷新</button>
              </div>
            </div>
            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div className="card">
                <pre style={{margin: 0, fontSize: 12, overflow: 'auto', maxHeight: 500}}>
                  {logs.map((log, i) => (
                    <div key={i} style={{padding: '4px 0', borderBottom: '1px solid #21262d'}}>
                      <span style={{color: '#8b949e'}}>{log.timestamp}</span>{' '}
                      <span style={{color: log.priority === 'ERROR' ? '#f85149' : '#c9d1d9'}}>[{log.priority}]</span>{' '}
                      {log.message}
                    </div>
                  ))}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #21262d; }
        .table th { color: #8b949e; font-weight: 600; font-size: 12; text-transform: uppercase; }
        .btn { padding: 8px 16px; border-radius: 6px; border: 1px solid #30363d; background: #21262d; color: #c9d1d9; cursor: pointer; font-size: 14; }
        .btn:hover { background: #30363d; }
        .btn-primary { background: #238636; border-color: #238636; }
        .btn-primary:hover { background: #2ea043; }
        .btn-small { padding: 4px 8px; font-size: 12; }
        .btn-danger { background: #da3633; border-color: #da3633; }
        .btn-danger:hover { background: #f85149; }
        .badge { padding: 2px 8px; border-radius: 12px; font-size: 12; background: #30363d; }
        .badge-success { background: #238636; }
        .loading, .empty-state { padding: 40px; text-align: center; color: #8b949e; }
        .content-header { display: flex; justify-content: space-between; align-items: center; }
      `}</style>
    </div>
  )
}

export default App
