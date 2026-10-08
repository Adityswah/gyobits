'use client';
import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useApp } from '@/context/AppContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface FinanceChartProps {
  chartData?: {
    labels: string[];
    pendapatan: number[];
    pengeluaran: number[];
  };
}

export default function FinanceChart({ chartData }: FinanceChartProps) {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const textColor = isDark ? '#FAF7F2' : '#1B1713';
  const mutedColor = isDark ? '#AEA59A' : '#6E6760';
  const gridColor = isDark ? '#3D3328' : '#DBD2C7';
  const tooltipBg = isDark ? '#1A1613' : '#FEFCFB';

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        align: 'start' as const,
        labels: {
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: 'Inter', size: 11 },
          color: textColor,
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: tooltipBg,
        titleColor: textColor,
        bodyColor: textColor,
        borderColor: gridColor,
        borderWidth: 1,
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const val = context.parsed.y ?? 0;
            return `${context.dataset.label || ''}: Rp ${val.toLocaleString('id-ID')}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: gridColor,
          drawBorder: false,
        },
        ticks: {
          font: { family: 'monospace', size: 11 },
          color: mutedColor,
          callback: (value: number | string) => {
            const num = Number(value);
            if (num >= 1000000) return `Rp ${(num / 1000000).toFixed(1)}jt`;
            if (num >= 1000) return `Rp ${(num / 1000).toFixed(0)}rb`;
            return `Rp ${num}`;
          },
        },
        border: { dash: [4, 4] }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          font: { family: 'monospace', size: 11 },
          color: mutedColor,
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    }
  };

  const labels = chartData?.labels && chartData.labels.length > 0
    ? chartData.labels
    : ['01 Okt', '02 Okt', '03 Okt', '04 Okt', '05 Okt', '06 Okt'];

  const pendapatanValues = chartData?.pendapatan ?? [0, 0, 0, 0, 0, 0];
  const pengeluaranValues = chartData?.pengeluaran ?? [0, 0, 0, 0, 0, 0];

  const totalPendapatan = pendapatanValues.reduce((a, b) => a + b, 0);
  const totalPengeluaran = pengeluaranValues.reduce((a, b) => a + b, 0);

  const data = {
    labels,
    datasets: [
      {
        label: `Pendapatan (Total Rp ${totalPendapatan.toLocaleString('id-ID')})`,
        data: pendapatanValues,
        borderColor: '#3D6B50',
        backgroundColor: '#3D6B50',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.2
      },
      {
        label: `Pengeluaran (Total Rp ${totalPengeluaran.toLocaleString('id-ID')})`,
        data: pengeluaranValues,
        borderColor: '#B8962E',
        backgroundColor: '#B8962E',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.2
      }
    ]
  };

  return (
    <div className="h-[250px] w-full mt-4">
      <Line options={options} data={data} />
    </div>
  );
}
