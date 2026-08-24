import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import ApiKeyInput from '../components/settings/ApiKeyInput';

export default function Settings() {
  const {
    binanceConfigured, binanceValid,
    bybitConfigured, bybitValid,
    loadKeyStatus, saveApiKeys, testConnection, clearKeys,
  } = useStore();

  const [bApi, setBApi] = useState('');
  const [bSecret, setBSecret] = useState('');
  const [ybApi, setYbApi] = useState('');
  const [ybSecret, setYbSecret] = useState('');

  const [bSaving, setBSaving] = useState(false);
  const [bTesting, setBTesting] = useState(false);
  const [ybSaving, setYbSaving] = useState(false);
  const [ybTesting, setYbTesting] = useState(false);

  const [bMsg, setBMsg] = useState('');
  const [ybMsg, setYbMsg] = useState('');

  useEffect(() => { loadKeyStatus(); }, [loadKeyStatus]);

  const handleSave = async (exchange: 'binance' | 'bybit') => {
    const [api, secret] = exchange === 'binance' ? [bApi, bSecret] : [ybApi, ybSecret];
    if (!api || !secret) return;
    const setSaving = exchange === 'binance' ? setBSaving : setYbSaving;
    setSaving(true);
    try {
      await saveApiKeys(exchange, { apiKey: api, secretKey: secret });
      await loadKeyStatus();
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (exchange: 'binance' | 'bybit') => {
    const [api, secret] = exchange === 'binance' ? [bApi, bSecret] : [ybApi, ybSecret];
    if (!api || !secret) return;
    const setTesting = exchange === 'binance' ? setBTesting : setYbTesting;
    const setMsg = exchange === 'binance' ? setBMsg : setYbMsg;
    setTesting(true);
    setMsg('');
    try {
      const ok = await testConnection(exchange, { apiKey: api, secretKey: secret });
      if (!ok) setMsg('连接失败 - 请检查 API Key 和 Secret Key 是否正确');
    } catch {
      setMsg('连接测试异常，请稍后重试');
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async (exchange: 'binance' | 'bybit') => {
    const setApi = exchange === 'binance' ? setBApi : setYbApi;
    const setSecret = exchange === 'binance' ? setBSecret : setYbSecret;
    const setMsg = exchange === 'binance' ? setBMsg : setYbMsg;
    setApi('');
    setSecret('');
    setMsg('');
    try {
      await clearKeys(exchange);
      await loadKeyStatus();
    } catch { /* ignore */ }
  };

  const bStatus: 'disconnected' | 'connected' | 'error' | 'testing' =
    bTesting ? 'testing' : binanceConfigured ? (binanceValid ? 'connected' : 'error') : 'disconnected';

  const ybStatus: 'disconnected' | 'connected' | 'error' | 'testing' =
    ybTesting ? 'testing' : bybitConfigured ? (bybitValid ? 'connected' : 'error') : 'disconnected';

  return (
    <div className="max-w-xl mx-auto py-6 space-y-8">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-semibold text-cmm-text">API 密钥管理</h1>
        <p className="text-sm text-cmm-muted/70 mt-1">
          请在此处配置您的交易所 API 密钥，密钥将安全存储在服务器端，不会暴露在前端。
        </p>
      </div>

      {/* Binance */}
      <ApiKeyInput
        label="Binance"
        apiKey={bApi}
        secretKey={bSecret}
        onChangeApiKey={setBApi}
        onChangeSecretKey={setBSecret}
        status={bStatus}
        statusMessage={bMsg}
        onSave={() => handleSave('binance')}
        onTest={() => handleTest('binance')}
        onClear={() => handleClear('binance')}
        saving={bSaving}
        testing={bTesting}
      />

      {/* Bybit */}
      <ApiKeyInput
        label="Bybit"
        apiKey={ybApi}
        secretKey={ybSecret}
        onChangeApiKey={setYbApi}
        onChangeSecretKey={setYbSecret}
        status={ybStatus}
        statusMessage={ybMsg}
        onSave={() => handleSave('bybit')}
        onTest={() => handleTest('bybit')}
        onClear={() => handleClear('bybit')}
        saving={ybSaving}
        testing={ybTesting}
      />

      {/* Status Summary */}
      <div className="bg-cmm-card rounded-xl border border-cmm-border p-4 space-y-2">
        <h3 className="text-sm font-semibold text-cmm-text">配置状态</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${binanceConfigured && binanceValid ? 'bg-green-500' : 'bg-red-400/60'}`} />
            Binance {binanceConfigured && binanceValid ? '✅ 已配置' : '❌ 未配置'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${bybitConfigured && bybitValid ? 'bg-green-500' : 'bg-red-400/60'}`} />
            Bybit {bybitConfigured && bybitValid ? '✅ 已配置' : '❌ 未配置'}
          </span>
        </div>
      </div>
    </div>
  );
}
