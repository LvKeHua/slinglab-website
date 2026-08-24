"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Key, Save, Trash2, Wifi, Loader2, LogOut } from "lucide-react"
import { saveKeys, clearKeys, getKeyStatus, testConnection } from "@/lib/api-client"
import type { SettingsStatus } from "@/types"

const EXCHANGE_INFO = {
  binance: { name: "Binance", color: "text-amber-400" },
  bybit: { name: "Bybit", color: "text-blue-400" },
} as const

type Exchange = keyof typeof EXCHANGE_INFO

interface ExchangeFormState {
  apiKey: string
  secretKey: string
  showSecret: boolean
  saving: boolean
  testing: boolean
  testResult: { valid: boolean; error?: string } | null
}

function initForm(): ExchangeFormState {
  return { apiKey: "", secretKey: "", showSecret: false, saving: false, testing: false, testResult: null }
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SettingsStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState({ debankAccessKey: "", coinstatsApiKey: "" })
  const [providersSaving, setProvidersSaving] = useState(false)
  const [forms, setForms] = useState<Record<Exchange, ExchangeFormState>>({
    binance: initForm(),
    bybit: initForm(),
  })

  const loadStatus = useCallback(async () => {
    try {
      const s = await getKeyStatus()
      setStatus(s)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    void fetch("/api/v1/settings/providers")
      .then((r) => r.json())
      .then((p) => setProviders({ debankAccessKey: p.debankAccessKey ?? "", coinstatsApiKey: p.coinstatsApiKey ?? "" }))
      .catch(() => {})
  }, [loadStatus])

  async function handleSaveProviders() {
    setProvidersSaving(true)
    try {
      await fetch("/api/v1/settings/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(providers),
      })
    } finally {
      setProvidersSaving(false)
    }
  }

  function updateForm(exchange: Exchange, patch: Partial<ExchangeFormState>) {
    setForms((prev) => ({ ...prev, [exchange]: { ...prev[exchange], ...patch } }))
  }

  async function handleSave(exchange: Exchange) {
    const f = forms[exchange]
    if (!f.apiKey || !f.secretKey) return
    updateForm(exchange, { saving: true })
    try {
      await saveKeys(exchange, { apiKey: f.apiKey, secretKey: f.secretKey })
      updateForm(exchange, { apiKey: "", secretKey: "", saving: false })
      await loadStatus()
    } catch (e: unknown) {
      updateForm(exchange, { saving: false })
      alert("Save failed: " + (e instanceof Error ? e.message : "Unknown error"))
    }
  }

  async function handleTest(exchange: Exchange) {
    updateForm(exchange, { testing: true, testResult: null })
    try {
      const result = await testConnection(exchange)
      updateForm(exchange, { testing: false, testResult: result })
    } catch (e: unknown) {
      updateForm(exchange, {
        testing: false,
        testResult: { valid: false, error: e instanceof Error ? e.message : "Test failed" },
      })
    }
  }

  async function handleClear(exchange: Exchange) {
    updateForm(exchange, { saving: true })
    try {
      await clearKeys(exchange)
      updateForm(exchange, { saving: false })
      await loadStatus()
    } catch (e: unknown) {
      updateForm(exchange, { saving: false })
      alert("Clear failed: " + (e instanceof Error ? e.message : "Unknown error"))
    }
  }

  async function handleLogout() {
    try {
      await fetch("/stone/api/v1/logout", { method: "POST" })
    } catch {
      // even if the request fails, redirect — the cookie clears client-side on next gate
    }
    location.href = "/stone/"
  }

  function statusBadge(exchange: Exchange) {
    if (!status) return <Badge variant="outline">Unknown</Badge>
    const s = status[exchange]
    if (!s) return <Badge variant="secondary">Not configured</Badge>
    if (s.configured && s.valid) return <Badge variant="success">Connected</Badge>
    if (s.configured) return <Badge variant="warning">Pending</Badge>
    return <Badge variant="secondary">Not configured</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure exchange API keys for live data fetching
        </p>
      </div>

      <Separator />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-200">Security Notice</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Only create API keys with <strong className="text-foreground">Read-Only</strong> permissions.
                Do <strong className="text-red-400">NOT</strong> enable withdrawal or trading permissions.
                Your keys are encrypted before storage and never sent to the client.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(["binance", "bybit"] as Exchange[]).map((exchange) => {
        const info = EXCHANGE_INFO[exchange]
        const f = forms[exchange]
        return (
          <Card key={exchange}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  <span className={info.color}>{info.name}</span>
                </CardTitle>
                <CardDescription>
                  API credentials for {info.name} spot & futures trading
                </CardDescription>
              </div>
              {statusBadge(exchange)}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="text"
                  placeholder={info.name + " API Key"}
                  value={f.apiKey}
                  onChange={(e) => updateForm(exchange, { apiKey: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Secret Key</label>
                <div className="relative">
                  <Input
                    type={f.showSecret ? "text" : "password"}
                    placeholder={info.name + " Secret Key"}
                    value={f.secretKey}
                    onChange={(e) => updateForm(exchange, { secretKey: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => updateForm(exchange, { showSecret: !f.showSecret })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {f.showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => handleSave(exchange)}
                  disabled={!f.apiKey || !f.secretKey || f.saving}
                >
                  {f.saving ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1" />
                  )}
                  Save Keys
                </Button>
                {status?.[exchange]?.configured && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClear(exchange)}
                    disabled={f.saving}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
                {status?.[exchange]?.configured && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleTest(exchange)}
                    disabled={f.testing}
                  >
                    {f.testing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4 mr-1" />
                    )}
                    Test Connection
                  </Button>
                )}
                {f.testResult && (
                  <p
                    className={`text-xs ${f.testResult.valid ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {f.testResult.valid
                      ? "Connection OK — keys are valid."
                      : `Connection failed: ${f.testResult.error ?? "Unknown error"}`}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span>Data Providers</span>
            </CardTitle>
            <CardDescription>
              On-chain wallet data — DeBank (EVM) & CoinStats (Solana/Sui/Cosmos)
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">DeBank AccessKey</label>
            <Input
              type="password"
              placeholder="pro-openapi.debank.com AccessKey"
              value={providers.debankAccessKey}
              onChange={(e) => setProviders({ ...providers, debankAccessKey: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">CoinStats API Key</label>
            <Input
              type="password"
              placeholder="openapiv1.coinstats.app API key"
              value={providers.coinstatsApiKey}
              onChange={(e) => setProviders({ ...providers, coinstatsApiKey: e.target.value })}
            />
          </div>
          <Button size="sm" onClick={handleSaveProviders} disabled={providersSaving}>
            {providersSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Providers
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>登录会话</span>
            </CardTitle>
            <CardDescription>退出后需要重新输入密码才能访问</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            退出登录
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
