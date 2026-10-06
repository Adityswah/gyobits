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

export default function FinanceChart() {
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
          font: { family: 'Inter', size: 10 },
          color: '#1B1713'
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 100000,
        grid: {
          color: '#DBD2C7',
          drawBorder: false,
        },
        ticks: {
          font: { family: 'monospace', size: 11 },
          color: '#908B85',
          callback: (value: number | string) => `Rp ${value}`,
          stepSize: 50000,
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
          color: '#908B85',
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    }
  };

  const labels = ['01 Okt', '02 Okt', '03 Okt', '04 Okt', '05 Okt'];

  const data = {
    labels,
    datasets: [
      {
        label: 'Pendapatan Rp 0',
        data: [0, 0, 0, 0, 0],
        borderColor: '#3D6B50',
        backgroundColor: '#3D6B50',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      },
      {
        label: 'Pengeluaran Rp 0',
        data: [0, 0, 0, 0, 0],
        borderColor: '#B8962E',
        backgroundColor: '#B8962E',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1
      }
    ]
  };

  return (
    <div className="h-[250px] w-full mt-4">
      <Line options={options} data={data} />
    </div>
  );
}
