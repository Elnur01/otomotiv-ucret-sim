"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Scatter } from "react-chartjs-2";
import { Candidate, Matching } from "@/lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartFont = {
  family: "Inter, system-ui, sans-serif",
  size: 12,
};

const gridColor = "rgba(45, 51, 72, 0.5)";
const textColor = "#94a3b8";

// ─── 1. Scatter Plot: Beklenti vs Teklif ───
export function ExpectationVsOfferChart({
  candidates,
  matchings,
}: {
  candidates: Candidate[];
  matchings: Matching[];
}) {
  const offerMap = new Map(
    matchings
      .filter((m) => m.offered_salary != null)
      .map((m) => [m.candidate_id, m.offered_salary!])
  );

  const dataPoints = candidates
    .filter((c) => offerMap.has(c.id) && c.salary_expectation > 0)
    .map((c) => ({
      x: c.salary_expectation,
      y: offerMap.get(c.id)!,
    }));

  const maxVal =
    Math.max(...dataPoints.flatMap((d) => [d.x, d.y]), 50000) * 1.1;

  return (
    <Scatter
      data={{
        datasets: [
          {
            label: "Adaylar",
            data: dataPoints,
            backgroundColor: "rgba(245, 158, 11, 0.7)",
            borderColor: "#f59e0b",
            borderWidth: 1,
            pointRadius: 8,
            pointHoverRadius: 12,
          },
          {
            label: "Eşitlik Çizgisi",
            data: [
              { x: 0, y: 0 },
              { x: maxVal, y: maxVal },
            ],
            borderColor: "rgba(99, 102, 241, 0.4)",
            borderWidth: 2,
            borderDash: [8, 4],
            pointRadius: 0,
            showLine: true,
            type: "scatter" as const,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: textColor, font: chartFont } },
          title: {
            display: true,
            text: "Maaş Beklentisi vs. Teklif Edilen Maaş",
            color: "#e2e8f0",
            font: { ...chartFont, size: 16, weight: "bold" },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `Beklenti: ${(ctx.parsed.x ?? 0).toLocaleString("tr-TR")} TL — Teklif: ${(ctx.parsed.y ?? 0).toLocaleString("tr-TR")} TL`,
            },
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: "Maaş Beklentisi (TL)",
              color: textColor,
            },
            grid: { color: gridColor },
            ticks: { color: textColor, font: chartFont },
          },
          y: {
            title: {
              display: true,
              text: "Teklif Edilen Maaş (TL)",
              color: textColor,
            },
            grid: { color: gridColor },
            ticks: { color: textColor, font: chartFont },
          },
        },
      }}
    />
  );
}

// ─── 2. Gender Pay Gap Bar Chart ───
export function GenderPayGapChart({
  candidates,
  matchings,
}: {
  candidates: Candidate[];
  matchings: Matching[];
}) {
  const offerMap = new Map(
    matchings
      .filter((m) => m.offered_salary != null)
      .map((m) => [m.candidate_id, m.offered_salary!])
  );

  const genderGroups: Record<string, number[]> = {};
  candidates.forEach((c) => {
    const g = c.gender || "Belirtilmemiş";
    if (!genderGroups[g]) genderGroups[g] = [];
    const offer = offerMap.get(c.id);
    if (offer != null) genderGroups[g].push(offer);
  });

  const labels = Object.keys(genderGroups);
  const averages = labels.map((g) => {
    const vals = genderGroups[g];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  const colors: Record<string, string> = {
    Kadın: "#ec4899",
    Erkek: "#3b82f6",
    "Belirtmek İstemiyorum": "#8b5cf6",
    Belirtilmemiş: "#6b7280",
  };

  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "Ortalama Teklif (TL)",
            data: averages,
            backgroundColor: labels.map(
              (l) => colors[l] || "rgba(107,114,128,0.7)"
            ),
            borderColor: labels.map(
              (l) => colors[l] || "rgba(107,114,128,1)"
            ),
            borderWidth: 1,
            borderRadius: 8,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Cinsiyet Bazlı Ortalama Maaş Teklifi",
            color: "#e2e8f0",
            font: { ...chartFont, size: 16, weight: "bold" },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${(ctx.parsed.y ?? 0).toLocaleString("tr-TR")} TL`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: chartFont },
          },
          y: {
            title: { display: true, text: "TL", color: textColor },
            grid: { color: gridColor },
            ticks: { color: textColor, font: chartFont },
          },
        },
      }}
    />
  );
}

// ─── 3. Departman Bazlı Ortalama Maaşlar ───
export function DepartmentSalaryChart({
  candidates,
  matchings,
}: {
  candidates: Candidate[];
  matchings: Matching[];
}) {
  const offerMap = new Map(
    matchings
      .filter((m) => m.offered_salary != null)
      .map((m) => [m.candidate_id, m.offered_salary!])
  );

  const deptGroups: Record<string, number[]> = {};
  candidates.forEach((c) => {
    const dept = c.department || "Belirtilmemiş";
    if (!deptGroups[dept]) deptGroups[dept] = [];
    const offer = offerMap.get(c.id);
    if (offer != null) deptGroups[dept].push(offer);
  });

  const sorted = Object.entries(deptGroups)
    .map(([dept, vals]) => ({
      dept,
      avg: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0,
    }))
    .sort((a, b) => b.avg - a.avg);

  const barColors = [
    "#f59e0b",
    "#6366f1",
    "#10b981",
    "#3b82f6",
    "#ec4899",
    "#8b5cf6",
    "#14b8a6",
  ];

  return (
    <Bar
      data={{
        labels: sorted.map((d) => d.dept),
        datasets: [
          {
            label: "Ortalama Teklif (TL)",
            data: sorted.map((d) => d.avg),
            backgroundColor: sorted.map(
              (_, i) => barColors[i % barColors.length]
            ),
            borderRadius: 8,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: "Departman Bazlı Ortalama Maaş Teklifleri",
            color: "#e2e8f0",
            font: { ...chartFont, size: 16, weight: "bold" },
          },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${(ctx.parsed.x ?? 0).toLocaleString("tr-TR")} TL`,
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "TL", color: textColor },
            grid: { color: gridColor },
            ticks: { color: textColor, font: chartFont },
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor, font: { ...chartFont, size: 11 } },
          },
        },
      }}
    />
  );
}
