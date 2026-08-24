interface Tab {
  key: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export default function TabSwitch({ tabs, active, onChange }: Props) {
  return (
    <div className="flex gap-1 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`text-sm px-4 py-1.5 rounded-lg font-medium transition ${
            active === t.key ? 'bg-cmm-green/20 text-cmm-green' : 'bg-cmm-card text-cmm-muted hover:text-cmm-text'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
