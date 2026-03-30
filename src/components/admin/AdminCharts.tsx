'use client';

// Warrantee â Admin Chart Components
// Lightweight SVG-based charts for Analytics and Revenue tabs
// No external chart library needed â pure React + inline SVG

import { useMemo } from 'react';

// ============================================================
// BAR CHART
// ============================================================
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  title?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

export function BarChart({
  data,
  height = 200,
  title,
  valuePrefix = '',
  valueSuffix = '',
}: BarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = Math.max(20, Math.min(60, (600 - data.length * 8) / data.length));

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0' }}>
      {title && <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>{title}</h3>}
      <svg width="100%" viewBox={`0 0 ${Math.max(data.length * (barWidth + 8) + 40, 300)} ${height + 40}`}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <g key={pct}>
            <line
              x1="40" y1={height - height * pct + 10}
              x2={data.length * (barWidth + 8) + 40} y2={height - height * pct + 10}
              stroke="#F1F5F9" strokeWidth="1"
            />
            <text x="36" y={height - height * pct + 14} textAnchor="end" fill="#94A3B8" fontSize="10">
              {valuePrefix}{Math.round(maxVal * pct)}{valueSuffix}
            </text>
          </g>
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * height;
          const x = 44 + i * (barWidth + 8);
          return (
            <g key={i}>
              <rect
                x={x} y={height - barHeight + 10}
                width={barWidth} height={barHeight}
                fill={d.color || '#3B82F6'}
                rx="4"
              />
              <text
                x={x + barWidth / 2} y={height + 26}
                textAnchor="middle" fill="#64748B" fontSize="10"
              >
                {d.label}
              </text>
              <text
                x={x + barWidth / 2} y={height - barHeight + 4}
                textAnchor="middle" fill="#374151" fontSize="10" fontWeight="600"
              >
                {valuePrefix}{d.value}{valueSuffix}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================
// LINE CHART
// ============================================================
interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  title?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

export function LineChart({
  data,
  height = 180,
  color = '#2563EB',
  title,
  valuePrefix = '',
  valueSuffix = '',
}: LineChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const width = Math.max(data.length * 60, 400);

  const points = data.map((d, i) => ({
    x: 50 + i * ((width - 80) / Math.max(data.length - 1, 1)),
    y: height - (d.value / maxVal) * (height - 30) + 10,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1]?.x || 50} ${height + 10} L ${points[0]?.x || 50} ${height + 10} Z`;

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0' }}>
      {title && <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>{title}</h3>}
      <svg width="100%" viewBox={`0 0 ${width} ${height + 40}`}>
        {/* Grid */}
        {[0, 0.5, 1].map((pct) => (
          <g key={pct}>
            <line
              x1="45" y1={height - (height - 30) * pct + 10}
              x2={width - 20} y2={height - (height - 30) * pct + 10}
              stroke="#F1F5F9" strokeWidth="1"
            />
            <text x="40" y={height - (height - 30) * pct + 14} textAnchor="end" fill="#94A3B8" fontSize="10">
              {valuePrefix}{Math.round(maxVal * pct)}{valueSuffix}
            </text>
          </g>
        ))}
        {/* Area fill */}
        <path d={areaD} fill={color} opacity="0.08" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots and labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
            <text x={p.x} y={height + 28} textAnchor="middle" fill="#64748B" fontSize="10">
              {data[i].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ============================================================
// DONUT CHART
// ============================================================
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  title?: string;
  isRtl?: boolean;
}

export function DonutChart({ data, size = 160, title, isRtl = false }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = size / 2 - 10;
  const center = size / 2;
  const strokeWidth = 24;

  const segments = useMemo(() => {
    let offset = 0;
    return data.map((d) => {
      const pct = d.value / total;
      const seg = {
        ...d,
        pct,
        dashArray: `${pct * 2 * Math.PI * (radius - strokeWidth / 2)} ${2 * Math.PI * (radius - strokeWidth / 2)}`,
        dashOffset: -offset * 2 * Math.PI * (radius - strokeWidth / 2),
      };
      offset += pct;
      return seg;
    });
  }, [data, total, radius, strokeWidth]);

  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #E2E8F0' }}>
      {title && <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>{title}</h3>}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={center} cy={center}
              r={radius - strokeWidth / 2}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
              transform={`rotate(-90 ${center} ${center})`}
              strokeLinecap="round"
            />
          ))}
          <text x={center} y={center - 6} textAnchor="middle" fill="#0F172A" fontSize="20" fontWeight="700">
            {total}
          </text>
          <text x={center} y={center + 12} textAnchor="middle" fill="#94A3B8" fontSize="10">
            {isRtl ? 'Ø¥Ø¬ÙØ§ÙÙ' : 'Total'}
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.color }} />
              <span style={{ color: '#374151' }}>{d.label}</span>
              <span style={{ color: '#94A3B8' }}>({d.value})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: string;
  color?: string;
}

export function StatCard({ label, value, change, changeType = 'neutral', icon, color = '#3B82F6' }: StatCardProps) {
  const changeColor = changeType === 'positive' ? '#22C55E' : changeType === 'negative' ? '#EF4444' : '#94A3B8';
  return (
    <div style={{
      background: 'white', borderRadius: '12px', padding: '20px',
      border: '1px solid #E2E8F0', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, [document?.dir === 'rtl' ? 'left' : 'right']: 0,
        width: '80px', height: '80px', background: color, opacity: 0.05, borderRadius: '0 0 0 80px',
      }} />
      {icon && <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>}
      <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F172A' }}>{value}</div>
      {change && (
        <div style={{ fontSize: '12px', color: changeColor, marginTop: '4px', fontWeight: 500 }}>
          {change}
        </div>
      )}
    </div>
  );
}

