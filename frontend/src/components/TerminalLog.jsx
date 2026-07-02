// src/components/TerminalLog.jsx
import { useState, useEffect, useRef } from 'react';
import { subscribeToLogs } from '../api';
import { Terminal, Trash2, ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react';

export default function TerminalLog() {
  const [logs, setLogs] = useState([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // ALL, REQUEST, RESPONSE, ERROR
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeToLogs((newLog) => {
      setLogs((prev) => [...prev, newLog].slice(-100)); // Keep last 100 logs
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (bottomRef.current && isExpanded) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isExpanded]);

  const toggleExpandLog = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    if (filter === 'REQUEST') return log.direction === 'OUTGOING';
    if (filter === 'RESPONSE') return log.direction === 'INCOMING' && !log.error;
    if (filter === 'ERROR') return !!log.error || log.status === 'FAILED' || log.status === 'NET_ERR';
    return true;
  });

  const getStatusColor = (status) => {
    if (status === 'FAILED' || status === 'NET_ERR') return 'text-red-400';
    if (typeof status === 'number') {
      if (status >= 200 && status < 300) return 'text-emerald-400';
      if (status >= 400) return 'text-rose-400';
    }
    return 'text-amber-400';
  };

  return (
    <div className={`terminal-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="terminal-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="terminal-title">
          <Terminal size={16} className="text-cyan-400 animate-pulse" />
          <span>http-client-terminal@isde-minishop:~</span>
          <span className="terminal-status-indicator">
            {logs.some(l => l.status === 'NET_ERR') ? (
              <span className="status-badge error"><WifiOff size={12} /> Disconnected</span>
            ) : (
              <span className="status-badge active"><Wifi size={12} /> Connected</span>
            )}
          </span>
        </div>
        <div className="terminal-controls" onClick={(e) => e.stopPropagation()}>
          <button 
            className="terminal-btn-clear" 
            onClick={() => setLogs([])}
            title="Clear logs"
          >
            <Trash2 size={14} />
          </button>
          <button 
            className="terminal-btn-toggle" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="terminal-body">
          <div className="terminal-toolbar">
            <span className="text-xs text-slate-400">Filters:</span>
            <div className="filter-buttons">
              {['ALL', 'REQUEST', 'RESPONSE', 'ERROR'].map((f) => (
                <button
                  key={f}
                  className={`filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <span className="log-count text-xs text-slate-500 ml-auto">
              Showing {filteredLogs.length} logs
            </span>
          </div>

          <div className="terminal-console">
            {filteredLogs.length === 0 ? (
              <div className="terminal-empty-state">
                <span className="terminal-prompt">$ </span>
                <span className="text-slate-500">Awaiting network activities... Add items to cart or refresh product catalog.</span>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpandedDetails = expandedLogId === log.id;
                const isRequest = log.direction === 'OUTGOING';
                
                return (
                  <div key={`${log.id}-${log.direction}`} className={`log-entry ${isRequest ? 'req' : 'res'}`}>
                    <div className="log-summary" onClick={() => toggleExpandLog(log.id)}>
                      <span className="terminal-prompt">$ </span>
                      <span className="log-time text-slate-500">[{log.timestamp}]</span>{' '}
                      {isRequest ? (
                        <>
                          <span className="text-cyan-400 font-bold">{log.method}</span>{' '}
                          <span className="text-slate-300">{log.url}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-purple-400 font-bold">RESPONSE</span>{' '}
                          <span className={getStatusColor(log.status)}>
                            [{log.status}]
                          </span>{' '}
                          <span className="text-slate-400">{log.url.replace(/https?:\/\/[^/]+/, '')}</span>
                        </>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-slate-500 text-xs">
                        {isExpandedDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </span>
                    </div>

                    {isExpandedDetails && (
                      <div className="log-details">
                        {isRequest ? (
                          <div className="log-detail-section">
                            <div className="section-title">Headers</div>
                            <pre className="section-content text-slate-400">
                              {JSON.stringify(log.headers, null, 2)}
                            </pre>
                            {log.body && (
                              <>
                                <div className="section-title">Form Data / URL Encoded Payload</div>
                                <pre className="section-content text-amber-300 font-mono">
                                  {decodeURIComponent(log.body).split('&').join('\n')}
                                </pre>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="log-detail-section">
                            {log.error ? (
                              <div className="text-rose-400 font-bold p-1 bg-rose-950/30 rounded border border-rose-900/50">
                                Error: {log.error}
                              </div>
                            ) : (
                              <>
                                <div className="section-title">JSON Response</div>
                                <pre className="section-content text-emerald-400">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}
    </div>
  );
}
