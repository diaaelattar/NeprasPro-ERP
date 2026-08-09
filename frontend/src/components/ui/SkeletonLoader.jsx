/**
 * SkeletonLoader.jsx — Unified Design System Skeleton Shimmer Component
 * NeprasPro UI Component
 */

import React from 'react';

export function SkeletonBox({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="nep-shimmer"
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
    />
  );
}

export function SkeletonTable({ rows = 8, cols = 5, style = {} }) {
  return (
    <div style={{ overflowX: 'auto', width: '100%', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right', fontFamily: "'Cairo', sans-serif" }}>
        <thead>
          <tr style={{ background: '#0f172a', color: '#fff' }}>
            {Array.from({ length: cols }).map((_, j) => (
              <th key={j} style={{ padding: '10px 8px' }}>
                <SkeletonBox height="18px" width={j === 0 ? '40px' : j === 2 ? '140px' : '70px'} style={{ background: 'rgba(255,255,255,0.2)' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
              {Array.from({ length: cols }).map((_, j) => (
                <td key={j} style={{ padding: '10px 8px' }}>
                  <SkeletonBox height="18px" width={j === 0 ? '30px' : j === 2 ? '160px' : '65px'} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SkeletonLoader({ type = 'table', rows = 6, cols = 5 }) {
  if (type === 'table') {
    return <SkeletonTable rows={rows} cols={cols} />;
  }
  return <SkeletonBox height="100px" />;
}
