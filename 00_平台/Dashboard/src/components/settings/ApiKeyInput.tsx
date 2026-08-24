import { useState } from 'react';
import { Eye, EyeOff, Key, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface Props {
  label: string;
  apiKey: string;
  secretKey: string;
  onChangeApiKey: (v: string) => void;
  onChangeSecretKey: (v: string) => void;
  status: 'disconnected' | 'connected' | 'error' | 'testing';
  statusMessage?: string;
  onSave: () => void;
  onTest: () => void;
  onClear: () => void;
  saving?: boolean;
  testing?: boolean;
}

export default function ApiKeyInput({
  label,
  apiKey,
  secretKey,
  onChangeApiKey,
  onChangeSecretKey,
  status,
  statusMessage,
  onSave,
  onTest,
  onClear,
  saving,
  testing,
}: Props) {
  const [showApi, setShowApi] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const statusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 size={16} className="text-green-500" />;
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      case 'testing':
        return <HelpCircle size={16} className="text-yellow-400" />;
      default:
        return <XCircle size={16} className="text-red-400/60" />;
    }
  };

  const statusText = () => {
    switch (status) {
      case 'connected':
        return '已连接';
      case 'error':
        return statusMessage || '连接失败';
      case 'testing':
        return '验证中…';
      default:
        return '未配置';
    }
  };

  return (
    <div className="bg-cmm-card rounded-xl border border-cmm-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key size={18} className="text-cmm-green" />
          <h3 className="text-base font-semibold text-cmm-text">{label}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {statusIcon()}
          <span
            className={
              status === 'connected'
                ? 'text-green-500'
                : status === 'error'
                  ? 'text-red-500'
                  : status === 'testing'
                    ? 'text-yellow-400'
                    : 'text-cmm-muted/60'
            }
          >
            {statusText()}
          </span>
        </div>
      </div>

      {/* API Key */}
      <div>
        <label className="text-xs text-cmm-muted mb-1 block">API Key</label>
        <div className="relative">
          <input
            type={showApi ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => onChangeApiKey(e.target.value)}
            placeholder="输入 API Key"
            className="w-full bg-cmm-card2 border border-cmm-border rounded-lg px-3 py-2 pr-9 text-sm text-cmm-text placeholder-cmm-muted/40 outline-none focus:border-cmm-green/50 transition"
          />
          <button
            type="button"
            onClick={() => setShowApi(!showApi)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cmm-muted hover:text-cmm-text transition"
            tabIndex={-1}
          >
            {showApi ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Secret Key */}
      <div>
        <label className="text-xs text-cmm-muted mb-1 block">Secret Key</label>
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={secretKey}
            onChange={(e) => onChangeSecretKey(e.target.value)}
            placeholder="输入 Secret Key"
            className="w-full bg-cmm-card2 border border-cmm-border rounded-lg px-3 py-2 pr-9 text-sm text-cmm-text placeholder-cmm-muted/40 outline-none focus:border-cmm-green/50 transition"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-cmm-muted hover:text-cmm-text transition"
            tabIndex={-1}
          >
            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-cmm-muted/50 leading-relaxed">
        {label === 'Binance'
          ? '建议仅启用「读取」权限，无需开启「交易」和「提现」权限。新创建的 API 默认权限为只读。'
          : '建议仅启用「读取」权限，无需开启「交易」权限。系统生成的 API 密钥基于 HMAC 对称加密算法运作，请妥善保管密钥对。'}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving || !apiKey || !secretKey}
          className="px-4 py-1.5 text-xs font-medium rounded-lg bg-cmm-green text-white hover:bg-cmm-green/90 transition disabled:opacity-40"
        >
          {saving ? '保存中…' : '保存配置'}
        </button>
        <button
          onClick={onTest}
          disabled={testing || !apiKey || !secretKey}
          className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-40"
        >
          {testing ? 'Testing…' : '测试连接'}
        </button>
        <button
          onClick={onClear}
          className="px-4 py-1.5 text-xs font-medium rounded-lg bg-cmm-card2 text-cmm-muted hover:text-cmm-text border border-cmm-border transition"
        >
          清除
        </button>
      </div>
    </div>
  );
}
