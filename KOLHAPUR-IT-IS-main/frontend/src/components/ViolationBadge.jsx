export default function ViolationBadge({ label, count, tone = "amber" }) {
  const toneMap = {
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/25",
    blue: "bg-blue-500/15 text-blue-300 border-blue-500/25",
  };

  return (
    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneMap[tone] || toneMap.amber}`}>
      {label}: {count}
    </div>
  );
}
