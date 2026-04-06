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

interface Record {
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
  const [editingZone, setEditingZone] = useState<Zone | null>(null)
  const [showAddZone, setShowAddZone] = useState(false)
  const [showAddForwarder, setShowAddForwarder] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneType, setNewZoneType] = useState('master')
  const [newZoneFile, setNewZoneFile] = useState('')
  const [newForwarderName, setNewForwarderName] = useState('')
  const [newForwarderServers, setNewForwarderServers] = useState('')
  const [newForwarderDomains, setNewForwarderDomains] = useState('')
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [records, setRecords] = useState<Record[]>([])
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Record | null>(null)
  const [newRecordName, setNewRecordName] = useState('')
  const [newRecordType, setNewRecordType] = useState('A')
  const [newRecordTTL, setNewRecordTTL] = useState('3600')
  const [newRecordPriority, setNewRecordPriority] = useState('')
  const [newRecordValue, setNewRecordValue] = useState('')
  const [expandedZones, setExpandedZones] = useState<number[]>([])
  const [configData, setConfigData] = useState<any>(null)
  const [rawConfig, setRawConfig] = useState('')
  const [configTab, setConfigTab] = useState<'basic' | 'acls' | 'keys' | 'logging' | 'raw'>('basic')

  useEffect(() => {
    loadStatus()
  }, [])

  useEffect(() => {
    if (currentTab === 'logs') {
      loadLogs()
    } else if (currentTab === 'config') {
      loadConfig()
    }
  }, [currentTab])

  const loadStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`)
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      console.error('Failed to load status:', e)
    }
  }

  const loadZones = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/zones`)
      const data = await res.json()
      setZones(data)
    } catch (e) {
      console.error('Failed to load zones:', e)
    }
    setLoading(false)
  }

  const loadRecords = async (zoneName: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/zones/${zoneName}/records`)
      const data = await res.json()
      setRecords(data)
    } catch (e) {
      console.error('Failed to load records:', e)
    }
    setLoading(false)
  }

  const selectZone = (zone: Zone) => {
    setSelectedZone(zone)
    loadRecords(zone.name)
  }

  const addRecord = async () => {
    if (!selectedZone) return
    try {
      const res = await fetch(`${API_BASE}/zones/${selectedZone.name}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRecordName,
          type: newRecordType,
          ttl: parseInt(newRecordTTL) || 3600,
          priority: parseInt(newRecordPriority) || 0,
          value: newRecordValue
        })
      })
      if (res.ok) {
        setNewRecordName('')
        setNewRecordType('A')
        setNewRecordTTL('3600')
        setNewRecordPriority('')
        setNewRecordValue('')
        setShowAddRecord(false)
        loadRecords(selectedZone.name)
        loadStatus()
      }
    } catch (e) {
      alert('添加记录失败')
    }
  }

  const deleteRecord = async (id: number) => {
    if (!selectedZone) return
    if (!confirm('确定要删除这条记录吗？')) return
    try {
      const res = await fetch(`${API_BASE}/zones/${selectedZone.name}/records/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        loadRecords(selectedZone.name)
        loadStatus()
      }
    } catch (e) {
      alert('删除记录失败')
    }
  }

  useEffect(() => {
    if (currentTab === 'zones') {
      loadZones()
    } else if (currentTab === 'forwarders') {
      loadForwarders()
    }
  }, [currentTab])

  const loadForwarders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/forwarders`)
      const data = await res.json()
      setForwarders(data)
    } catch (e) {
      console.error('Failed to load forwarders:', e)
    }
    setLoading(false)
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        lines: logLines,
        ...(logFilter ? { filter: logFilter } : {})
      })
      const res = await fetch(`${API_BASE}/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (e) {
      console.error('Failed to load logs:', e)
    }
    setLoading(false)
  }

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/config`)
      const data = await res.json()
      setConfigData(data)
      setRawConfig(data.raw_content || '')
    } catch (e) {
      console.error('Failed to load config:', e)
    }
    setLoading(false)
  }

  const saveConfig = async () => {
    if (!confirm('确定要保存配置吗？')) return
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawConfig })
      })
      if (res.ok) {
        alert('配置已保存')
        loadConfig()
      } else {
        const data = await res.json()
        alert('保存失败: ' + data.error)
      }
    } catch (e) {
      alert('保存失败')
    }
  }

  const toggleZoneExpand = (zoneId: number) => {
    setExpandedZones(prev =>
      prev.includes(zoneId)
        ? prev.filter(id => id !== zoneId)
        : [...prev, zoneId]
    )
  }

  const restartServer = async () => {
    if (!confirm('确定要重启 BIND9 服务吗？')) return
    try {
      await fetch(`${API_BASE}/server/restart`, { method: 'POST' })
      alert('重启命令已发送')
      loadStatus()
    } catch (e) {
      alert('重启失败')
    }
  }

  const addZone = async () => {
    if (!newZoneName) {
      alert('请输入区域名')
      return
    }
    try {
      const file = newZoneFile || `/var/lib/bind/${newZoneName}.zone`
      await fetch(`${API_BASE}/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newZoneName,
          type: newZoneType,
          file: file
        })
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

  const deleteZone = async (name: string) => {
    if (!confirm(`确定要删除区域 ${name} 吗？`)) return
    try {
      await fetch(`${API_BASE}/zones/${name}`, { method: 'DELETE' })
      loadZones()
    } catch (e) {
      alert('删除失败')
    }
  }

  const addForwarder = async () => {
    if (!newForwarderName || !newForwarderServers) {
      alert('请填写名称和DNS服务器')
      return
    }
    try {
      await fetch(`${API_BASE}/forwarders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newForwarderName,
          servers: newForwarderServers,
          domains: newForwarderDomains
        })
      })
      setShowAddForwarder(false)
      setNewForwarderName('')
      setNewForwarderServers('')
      setNewForwarderDomains('')
      loadForwarders()
    } catch (e) {
      alert('添加失败')
    }
  }

  const deleteForwarder = async (id: number) => {
    if (!confirm('确定要删除此转发配置吗？')) return
    try {
      await fetch(`${API_BASE}/forwarders/${id}`, { method: 'DELETE' })
      loadForwarders()
    } catch (e) {
      alert('删除失败')
    }
  }

  const toggleForwarder = async (forwarder: Forwarder) => {
    try {
      await fetch(`${API_BASE}/forwarders/${forwarder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...forwarder,
          enabled: !forwarder.enabled
        })
      })
      loadForwarders()
    } catch (e) {
      alert('更新失败')
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>🛠️ BIND9 Panel</h1>
        </div>
        <nav className="nav">
          <div className={`nav-item ${currentTab === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentTab('dashboard')}>
            📊 仪表盘
          </div>
          <div className={`nav-item ${currentTab === 'zones' ? 'active' : ''}`} onClick={() => setCurrentTab('zones')}>
            🌐 区域管理
          </div>
          <div className={`nav-item ${currentTab === 'forwarders' ? 'active' : ''}`} onClick={() => setCurrentTab('forwarders')}>
            🔄 DNS转发
          </div>
          <div className={`nav-item ${currentTab === 'config' ? 'active' : ''}`} onClick={() => setCurrentTab('config')}>
            ⚙️ 配置
          </div>
          <div className={`nav-item ${currentTab === 'logs' ? 'active' : ''}`} onClick={() => setCurrentTab('logs')}>
            📋 日志
          </div>
        </nav>
      </aside>

      <main className="main-content">
        {currentTab === 'dashboard' && (
          <div className="content">
            <h2>服务器状态</h2>
            {status ? (
              <div className="card-grid">
                <div className="card">
                  <div className="card-title">运行状态</div>
                  <div className={`status-badge ${status.running ? 'running' : 'stopped'}`}>
                    {status.running ? '● 运行中' : '○ 已停止'}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">BIND 版本</div>
                  <div className="card-value">{status.version || '未知'}</div>
                </div>
                <div className="card">
                  <div className="card-title">区域数量</div>
                  <div className="card-value">{status.zone_count}</div>
                </div>
                <div className="card">
                  <div className="card-title">记录数量</div>
                  <div className="card-value">{status.record_count}</div>
                </div>
              </div>
            ) : (
              <div className="loading">加载中...</div>
            )}

            <div className="actions">
              <button className="btn" onClick={loadStatus}>🔄 刷新状态</button>
              <button className="btn btn-primary" onClick={restartServer}>🔁 重启服务</button>
            </div>
          </div>
        )}

        {currentTab === 'zones' && (
          <div className="content">
            <div className="content-header">
              <h2>DNS 区域</h2>
              <button className="btn btn-primary" onClick={() => setShowAddZone(true)}>➕ 添加区域</button>
            </div>

            {showAddZone && (
              <div className="card" style={{marginBottom: 16}}>
                <h3>添加新区域</h3>
                <div style={{display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap'}}>
                  <input
                    type="text"
                    placeholder="区域名 (如: example.com)"
                    value={newZoneName}
                    onChange={e => setNewZoneName(e.target.value)}
                    style={inputStyle}
                  />
                  <select value={newZoneType} onChange={e => setNewZoneType(e.target.value)} style={inputStyle}>
                    <option value="master">Master</option>
                    <option value="slave">Slave</option>
                    <option value="forward">Forward</option>
                  </select>
                  <input
                    type="text"
                    placeholder="区域文件路径 (可选)"
                    value={newZoneFile}
                    onChange={e => setNewZoneFile(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{marginTop: 12}}>
                  <button className="btn btn-primary" onClick={addZone}>确认添加</button>
                  <button className="btn" onClick={() => setShowAddZone(false)} style={{marginLeft: 8}}>取消</button>
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
                          placeholder="优先级 (如: 10)"
                          value={newRecordPriority}
                          onChange={e => setNewRecordPriority(e.target.value)}
                          style={{...inputStyle, width: 80}}
                        />
                      )}
                      <input
                        type="text"
                        placeholder="记录值 (如: 1.2.3.4)"
                        value={newRecordValue}
                        onChange={e => setNewRecordValue(e.target.value)}
                        style={{...inputStyle, flex: 1, minWidth: 200}}
                      />
                    </div>
                    <div style={{marginTop: 12}}>
                      <button className="btn btn-primary" onClick={addRecord}>确认添加</button>
                      <button className="btn" onClick={() => setShowAddRecord(false)} style={{marginLeft: 8}}>取消</button>
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
                            <td>{record.name}</td>
                            <td><span className="tag">{record.type}</span></td>
                            <td>{record.ttl}</td>
                            <td>{record.priority || '-'}</td>
                            <td style={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis'}}>{record.value}</td>
                            <td>
                              <button className="btn btn-small" onClick={() => setEditingRecord(record)}>✏️ 编辑</button>
                              <button className="btn btn-small btn-danger" onClick={() => deleteRecord(record.id)}>🗑️ 删除</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Edit Zone Modal */}
            {editingZone && (
              <EditZoneModal
                zone={editingZone}
                onClose={() => setEditingZone(null)}
                onSave={() => {
                  setEditingZone(null)
                  loadZones()
                }}
              />
            )}

            {/* Edit Record Modal */}
            {editingRecord && (
              <EditRecordModal
                record={editingRecord}
                onClose={() => setEditingRecord(null)}
                onSave={() => {
                  setEditingRecord(null)
                  if (selectedZone) loadRecords(selectedZone.name)
                }}
              />
            )}
          </div>
        )}

        {currentTab === 'forwarders' && (
          <div className="content">
            <div className="content-header">
              <h2>DNS 转发配置</h2>
              <button className="btn btn-primary" onClick={() => setShowAddForwarder(true)}>➕ 添加转发</button>
            </div>

            {showAddForwarder && (
              <div className="card" style={{marginBottom: 16}}>
                <h3>添加 DNS 转发</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12}}>
                  <input
                    type="text"
                    placeholder="配置名称 (如: Google DNS)"
                    value={newForwarderName}
                    onChange={e => setNewForwarderName(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="DNS服务器 (如: 8.8.8.8, 1.1.1.1)"
                    value={newForwarderServers}
                    onChange={e => setNewForwarderServers(e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="匹配的域名 (留空表示全部，不填或用逗号分隔多个)"
                    value={newForwarderDomains}
                    onChange={e => setNewForwarderDomains(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{marginTop: 12}}>
                  <button className="btn btn-primary" onClick={addForwarder}>确认添加</button>
                  <button className="btn" onClick={() => setShowAddForwarder(false)} style={{marginLeft: 8}}>取消</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading">加载中...</div>
            ) : forwarders.length === 0 ? (
              <div className="empty-state">
                <p>暂无转发配置</p>
                <p style={{fontSize: 12, marginTop: 8, color: '#8b949e'}}>
                  添加转发配置后，所有匹配的 DNS 查询将被转发到指定的 DNS 服务器
                </p>
              </div>
            ) : (
              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>名称</th>
                      <th>DNS服务器</th>
                      <th>域名</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forwarders.map(f => (
                      <tr key={f.id} style={{opacity: f.enabled ? 1 : 0.5}}>
                        <td>{f.name}</td>
                        <td>{f.servers}</td>
                        <td>{f.domains || '(全部)'}</td>
                        <td>
                          <button
                            className={`btn btn-small ${f.enabled ? 'btn-primary' : ''}`}
                            onClick={() => toggleForwarder(f)}
                          >
                            {f.enabled ? '✓ 启用' : '○ 禁用'}
                          </button>
                        </td>
                        <td>
                          <button className="btn btn-small btn-danger" onClick={() => deleteForwarder(f.id)}>🗑️ 删除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentTab === 'config' && (
          <div className="content">
            <div className="content-header">
              <h2>BIND9 配置管理</h2>
              <div style={{display: 'flex', gap: 8}}>
                <button className="btn btn-primary" onClick={() => setConfigTab('basic')}>基本设置</button>
                <button className="btn" onClick={() => setConfigTab('acls')}>访问控制</button>
                <button className="btn" onClick={() => setConfigTab('keys')}>密钥</button>
                <button className="btn" onClick={() => setConfigTab('raw')}>原始配置</button>
              </div>
            </div>

            {configTab === 'basic' && configData && (
              <div>
                <div className="card" style={{marginBottom: 16}}>
                  <h3 style={{marginBottom: 16}}>全局选项</h3>

                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
                    <div>
                      <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>工作目录</label>
                      <input
                        type="text"
                        value={configData.options?.directory || ''}
                        readOnly
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>监听端口</label>
                      <input
                        type="text"
                        value={configData.options?.port || 53}
                        readOnly
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>递归查询</label>
                      <span className={`tag ${configData.options?.recursion ? 'tag-info' : 'tag-error'}`}>
                        {configData.options?.recursion ? '启用' : '禁用'}
                      </span>
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>DNSSEC 验证</label>
                      <span className={`tag ${configData.options?.dnssec_validation ? 'tag-info' : 'tag-error'}`}>
                        {configData.options?.dnssec_validation ? '启用' : '禁用'}
                      </span>
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>转发策略</label>
                      <input
                        type="text"
                        value={configData.options?.forward || '无'}
                        readOnly
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>PID 文件</label>
                      <input
                        type="text"
                        value={configData.options?.pid_file || ''}
                        readOnly
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div style={{marginTop: 16}}>
                    <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>允许查询</label>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                      {(configData.options?.allow_query || ['127.0.0.1']).map((ip: string, idx: number) => (
                        <span key={idx} className="tag" style={{marginBottom: 4}}>{ip}</span>
                      ))}
                    </div>
                  </div>

                  <div style={{marginTop: 16}}>
                    <label style={{display: 'block', marginBottom: 8, color: '#8b949e'}}>转发器</label>
                    {configData.options?.forwarders?.length > 0 ? (
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                        {configData.options.forwarders.map((ip: string, idx: number) => (
                          <span key={idx} className="tag tag-info" style={{marginBottom: 4}}>{ip}</span>
                        ))}
                      </div>
                    ) : (
                      <span style={{color: '#8b949e'}}>未配置</span>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h3 style={{marginBottom: 16}}>统计信息</h3>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16}}>
                    <div>
                      <div className="card-title">区域数</div>
                      <div className="card-value">{status?.zone_count || 0}</div>
                    </div>
                    <div>
                      <div className="card-title">记录数</div>
                      <div className="card-value">{status?.record_count || 0}</div>
                    </div>
                    <div>
                      <div className="card-title">ACL 数</div>
                      <div className="card-value">{configData.acls?.length || 0}</div>
                    </div>
                    <div>
                      <div className="card-title">密钥数</div>
                      <div className="card-value">{configData.keys?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {configTab === 'acls' && configData && (
              <div className="card">
                <h3 style={{marginBottom: 16}}>访问控制列表 (ACL)</h3>
                {configData.acls?.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configData.acls.map((acl: any, idx: number) => (
                        <tr key={idx}>
                          <td>{acl.name}</td>
                          <td>
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: 4}}>
                              {acl.values?.map((v: string, i: number) => (
                                <span key={i} className="tag" style={{marginBottom: 2}}>{v}</span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{color: '#8b949e'}}>暂无 ACL 配置</p>
                )}
              </div>
            )}

            {configTab === 'keys' && configData && (
              <div className="card">
                <h3 style={{marginBottom: 16}}>TSIG 密钥</h3>
                {configData.keys?.length > 0 ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>名称</th>
                        <th>算法</th>
                        <th>密钥</th>
                      </tr>
                    </thead>
                    <tbody>
                      {configData.keys.map((key: any, idx: number) => (
                        <tr key={idx}>
                          <td>{key.name}</td>
                          <td>{key.algorithm}</td>
                          <td style={{fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all'}}>
                            {key.secret ? '********' : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{color: '#8b949e'}}>暂无密钥配置</p>
                )}
              </div>
            )}

            {configTab === 'raw' && (
              <div>
                <div className="card" style={{marginBottom: 16}}>
                  <h3 style={{marginBottom: 16}}>原始配置</h3>
                  <textarea
                    value={rawConfig}
                    onChange={e => setRawConfig(e.target.value)}
                    style={{
                      ...inputStyle,
                      width: '100%',
                      minHeight: 400,
                      fontFamily: 'monospace',
                      fontSize: 13,
                      resize: 'vertical'
                    }}
                  />
                  <div style={{marginTop: 16}}>
                    <button className="btn btn-primary" onClick={saveConfig}>💾 保存配置</button>
                    <span style={{marginLeft: 12, color: '#8b949e', fontSize: 12}}>
                      保存前请确保配置语法正确，错误可能导致服务无法启动
                    </span>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{marginBottom: 12}}>配置文件备份</h3>
                  <button className="btn" onClick={loadConfig}>🔄 刷新</button>
                  <p style={{marginTop: 12, color: '#8b949e', fontSize: 12}}>
                    配置文件路径: /etc/bind/named.conf
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {currentTab === 'logs' && (
          <div className="content">
            <div className="content-header">
              <h2>DNS 查询日志</h2>
              <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                <input
                  type="text"
                  placeholder="过滤关键词"
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value)}
                  style={{...inputStyle, width: 150}}
                />
                <select value={logLines} onChange={e => setLogLines(e.target.value)} style={inputStyle}>
                  <option value="50">50条</option>
                  <option value="100">100条</option>
                  <option value="200">200条</option>
                  <option value="500">500条</option>
                </select>
                <button className="btn btn-primary" onClick={loadLogs}>🔄 刷新</button>
              </div>
            </div>

            {loading ? (
              <div className="loading">加载中...</div>
            ) : logs.length === 0 ? (
              <div className="card">
                <p style={{color: '#8b949e'}}>暂无日志记录</p>
              </div>
            ) : (
              <div className="card" style={{padding: 0}}>
                <div style={{maxHeight: 500, overflow: 'auto'}}>
                  <table className="table" style={{margin: 0}}>
                    <thead>
                      <tr>
                        <th style={{width: 160}}>时间</th>
                        <th style={{width: 80}}>级别</th>
                        <th>消息</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, idx) => (
                        <tr key={idx}>
                          <td style={{fontSize: 12, color: '#8b949e'}}>{log.timestamp}</td>
                          <td>
                            <span className={`tag ${
                              log.priority === 'error' ? 'tag-error' :
                              log.priority === 'warning' ? 'tag-warning' :
                              'tag-info'
                            }`}>
                              {log.priority}
                            </span>
                          </td>
                          <td style={{fontSize: 13, wordBreak: 'break-all'}}>{log.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

interface EditZoneModalProps {
  zone: Zone
  onClose: () => void
  onSave: () => void
}

function EditZoneModal({ zone, onClose, onSave }: EditZoneModalProps) {
  const [name, setName] = useState(zone.name)
  const [type, setType] = useState(zone.type)
  const [file, setFile] = useState(zone.file)

  const handleSave = async () => {
    try {
      await fetch(`${API_BASE}/zones/${zone.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, file })
      })
      onSave()
    } catch (e) {
      alert('保存失败')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{ width: 400, padding: 24 }}>
        <h3>编辑区域</h3>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>域名</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>类型</label>
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          >
            <option value="master">Master</option>
            <option value="slave">Slave</option>
            <option value="forward">Forward</option>
          </select>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>区域文件</label>
          <input
            type="text"
            value={file}
            onChange={e => setFile(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave}>保存</button>
          <button className="btn" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}

interface EditRecordModalProps {
  record: Record
  onClose: () => void
  onSave: () => void
}

function EditRecordModal({ record, onClose, onSave }: EditRecordModalProps) {
  const [name, setName] = useState(record.name)
  const [type, setType] = useState(record.type)
  const [ttl, setTTL] = useState(record.ttl.toString())
  const [priority, setPriority] = useState(record.priority.toString())
  const [value, setValue] = useState(record.value)

  const handleSave = async () => {
    try {
      await fetch(`${API_BASE}/zones/${record.zone_id}/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type,
          ttl: parseInt(ttl) || 3600,
          priority: parseInt(priority) || 0,
          value
        })
      })
      onSave()
    } catch (e) {
      alert('保存失败')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{ width: 450, padding: 24 }}>
        <h3>编辑 DNS 记录</h3>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>名称</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>类型</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            >
              <option value="A">A</option>
              <option value="AAAA">AAAA</option>
              <option value="CNAME">CNAME</option>
              <option value="MX">MX</option>
              <option value="TXT">TXT</option>
              <option value="NS">NS</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>TTL</label>
            <input
              type="text"
              value={ttl}
              onChange={e => setTTL(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>
          {type === 'MX' && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>优先级</label>
              <input
                type="text"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                style={{ ...inputStyle, width: '100%' }}
              />
            </div>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#8b949e' }}>值</label>
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>
        <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave}>保存</button>
          <button className="btn" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  )
}

export default App
