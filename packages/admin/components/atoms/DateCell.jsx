import { FaRegClock } from 'react-icons/fa';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
});
const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function DateCell({ value }) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return <span className="text-sm text-gray-400">—</span>;
  }

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="w-24 text-sm font-semibold text-slate-800 tabular-nums">
        {dateFmt.format(date)}
      </span>

      <span className="bg-faint-blue flex w-24 items-center justify-center gap-1.5 rounded-full py-0.5 text-xs font-medium text-slate-600 tabular-nums">
        <FaRegClock size={10} className="text-primary-blue" />
        {timeFmt.format(date)}
      </span>
    </div>
  );
}

