import type React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
};

export default function Badge({ children, className = '' }: BadgeProps) {
  return <span className={`badge ${className}`.trim()}>{children}</span>;
}
