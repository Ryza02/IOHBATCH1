"use client";
import useSWR from "swr";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip } from "chart.js";
ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip);

const fetcher = (url)=>fetch(url).then(r=>r.json());

export default function MetricCard({ title, metric, qs }){
  const { data, isLoading } = useSWR(qs ? `/api/sector/chart?metric=${metric}&${qs}` : null, fetcher, {
    revalidateOnFocus:false, keepPreviousData:true
  });

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 h-full p-4">
      <div className="font-semibold text-white/90 mb-2">{title}</div>
      {!qs ? (
        <div className="h-[260px] grid place-items-center text-white/50 text-sm">Pilih sector & cell</div>
      ) : isLoading || !data?.labels ? (
        <div className="h-[260px] animate-pulse rounded-lg bg-white/5 border border-white/10" />
      ) : (
        <Line
          data={{
            labels: data.labels,
            datasets: (data.datasets || []).map(ds => ({ ...ds, borderWidth:2, fill:false, pointRadius:2 })),
          }}
          options={{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ position:"right", labels:{ color:"#e5e7eb" } } },
            scales:{
              x:{ ticks:{ color:"#cbd5e1" }, grid:{ color:"rgba(255,255,255,0.06)" } },
              y:{ ticks:{ color:"#cbd5e1" }, grid:{ color:"rgba(255,255,255,0.06)" } },
            }
          }}
          height={260}
        />
      )}
    </div>
  );
}
