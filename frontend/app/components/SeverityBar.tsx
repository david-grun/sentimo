export default function SeverityBar({ severity }: { severity: number }) {
  const percent = (severity / 5) * 100;
  const color =
    severity >= 4 ? "bg-red-500" : severity >= 3 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="h-2 w-full rounded-full bg-black/10 dark:bg-white/10">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
