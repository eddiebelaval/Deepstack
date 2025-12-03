"use client"

import { useEffect, useState } from 'react'
import { api, AccountSummary } from '@/lib/api'

export default function HomePage() {
  const [account, setAccount] = useState<AccountSummary | null>(null)
  const [status, setStatus] = useState<{ running: boolean; cadence_s: number; last_action?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      setLoading(true)
      setError(null)
      const [acct, stat] = await Promise.all([api.account(), api.automationStatus()])
      setAccount(acct)
      setStatus(stat)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function start() {
    await api.automationStart(5)
    await refresh()
  }
  async function stop() {
    await api.automationStop()
    await refresh()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex items-center gap-3">
        <span className={`px-2 py-1 rounded text-xs ${status?.running ? 'bg-green-900 text-green-300' : 'bg-slate-800 text-slate-300'}`}>
          {status?.running ? 'RUNNING' : 'STOPPED'}
        </span>
        <button onClick={start} className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm">Start</button>
        <button onClick={stop} className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm">Stop</button>
        <button onClick={refresh} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Refresh</button>
      </div>

      {loading && <div className="text-slate-400">Loading...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {account && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <div className="text-slate-400 text-xs">Portfolio Value</div>
            <div className="text-xl">${account.portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <div className="text-slate-400 text-xs">Cash</div>
            <div className="text-xl">${account.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <div className="text-slate-400 text-xs">Buying Power</div>
            <div className="text-xl">${account.buying_power.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-slate-900 rounded p-4 border border-slate-800">
            <div className="text-slate-400 text-xs">Day P&L</div>
            <div className={`text-xl ${account.day_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {account.day_pnl >= 0 ? '+' : ''}${account.day_pnl.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="text-slate-400 text-sm">Cadence: {status.cadence_s}s {status.last_action ? `| Last: ${status.last_action}` : ''}</div>
      )}
    </div>
  )
}
