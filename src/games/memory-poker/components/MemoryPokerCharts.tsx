/**
 * Result-screen charts. Kept in their own module so recharts is only
 * downloaded when a match result is shown, not when the game opens.
 */
import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface ScorePoint {
  round: string;
  p1: number;
  opponent: number;
  summary: string;
}

export const ScoreProgressionChart: React.FC<{
  data: ScorePoint[];
  maxScore: number;
  p1Name: string;
  opponentName: string;
}> = ({ data, maxScore, p1Name, opponentName }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ top: 8, right: 14, left: -12, bottom: 2 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
      <XAxis
        dataKey="round"
        stroke="var(--text-muted)"
        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        axisLine={{ stroke: 'var(--chart-axis)' }}
        tickLine={false}
      />
      <YAxis
        allowDecimals={false}
        domain={[0, Math.max(2, maxScore)]}
        stroke="var(--text-muted)"
        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip
        content={({ active, payload, label }) => {
          if (!active || !payload || payload.length === 0) return null;
          const point = payload[0].payload as ScorePoint;
          return (
            <div className="rounded-lg obsidian-panel px-3 py-2 shadow-lg text-xs space-y-1">
              <div className="font-mono-tabular font-bold theme-text-primary">{label}</div>
              <div className="font-mono-tabular theme-text-gold font-semibold">
                {p1Name}: {point.p1}점
              </div>
              <div className="font-mono-tabular theme-text-rival font-semibold">
                {opponentName}: {point.opponent}점
              </div>
              <div className="theme-text-secondary pt-0.5 border-t theme-border">{point.summary}</div>
            </div>
          );
        }}
      />
      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '6px' }} />
      <Line
        type="linear"
        dataKey="p1"
        name={p1Name}
        stroke="var(--color-gold-500)"
        strokeWidth={2.5}
        dot={{ r: 4, fill: 'var(--color-gold-400)', stroke: 'var(--color-gold-950)', strokeWidth: 1.5 }}
        activeDot={{ r: 6 }}
        isAnimationActive={false}
      />
      <Line
        type="linear"
        dataKey="opponent"
        name={opponentName}
        stroke="var(--color-rival-500)"
        strokeWidth={2.5}
        dot={{ r: 4, fill: 'var(--color-rival-400)', stroke: 'var(--color-rival-950)', strokeWidth: 1.5 }}
        activeDot={{ r: 6 }}
        isAnimationActive={false}
      />
    </LineChart>
  </ResponsiveContainer>
);

export interface WinRateSlice {
  name: string;
  value: number;
  rate: number;
  color: string;
}

export const WinRatePieChart: React.FC<{ slices: WinRateSlice[] }> = ({ slices }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={slices}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        innerRadius={42}
        outerRadius={66}
        paddingAngle={slices.length > 1 ? 3 : 0}
        stroke="none"
        isAnimationActive={false}
      >
        {slices.map((slice) => (
          <Cell key={slice.name} fill={slice.color} />
        ))}
      </Pie>
      <Tooltip
        content={({ active, payload }) => {
          if (!active || !payload || payload.length === 0) return null;
          const item = payload[0].payload as WinRateSlice;
          return (
            <div className="rounded-lg obsidian-panel px-2.5 py-1.5 shadow-lg text-xs font-mono-tabular theme-text-primary">
              {item.name}: {item.value}승 ({item.rate}%)
            </div>
          );
        }}
      />
    </PieChart>
  </ResponsiveContainer>
);

export interface HandComparisonRow {
  shortName: string;
  fullName: string;
  p1: number;
  opponent: number;
}

export const HandComparisonChart: React.FC<{
  data: HandComparisonRow[];
  p1Name: string;
  opponentName: string;
}> = ({ data, p1Name, opponentName }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 8, right: 10, left: -16, bottom: 4 }} barGap={2}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
      <XAxis
        dataKey="shortName"
        stroke="var(--text-muted)"
        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
        axisLine={{ stroke: 'var(--chart-axis)' }}
        tickLine={false}
        interval={0}
      />
      <YAxis
        allowDecimals={false}
        stroke="var(--text-muted)"
        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
        axisLine={false}
        tickLine={false}
      />
      <Tooltip
        cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
        content={({ active, payload }) => {
          if (!active || !payload || payload.length === 0) return null;
          const row = payload[0].payload as HandComparisonRow;
          return (
            <div className="rounded-lg obsidian-panel px-3 py-2 shadow-lg text-xs space-y-1">
              <div className="font-bold theme-text-primary">{row.fullName}</div>
              <div className="font-mono-tabular theme-text-gold">
                {p1Name}: {row.p1}회
              </div>
              <div className="font-mono-tabular theme-text-rival">
                {opponentName}: {row.opponent}회
              </div>
            </div>
          );
        }}
      />
      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }} />
      <Bar
        dataKey="p1"
        name={p1Name}
        fill="var(--color-gold-400)"
        radius={[4, 4, 0, 0]}
        maxBarSize={20}
        isAnimationActive={false}
      />
      <Bar
        dataKey="opponent"
        name={opponentName}
        fill="var(--color-rival-500)"
        radius={[4, 4, 0, 0]}
        maxBarSize={20}
        isAnimationActive={false}
      />
    </BarChart>
  </ResponsiveContainer>
);
