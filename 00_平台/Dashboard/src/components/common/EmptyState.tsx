interface Props {
  text: string;
}

export default function EmptyState({ text }: Props) {
  return (
    <div className="text-center py-10 text-cmm-muted text-sm">
      {text}
    </div>
  );
}
