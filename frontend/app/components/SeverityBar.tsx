export default function SeverityBar({ severity }: { severity: number }) {
  const percent = (severity / 5) * 100;
  const color = severity >= 4 ? "bg-rose-500" : severity >= 3 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${percent}%` }} />
    </div>
  );
}
