import type React from 'react';

type CardProps = {
  title?: string;
  description?: string;
  highlight?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export default function Card({
  title,
  description,
  highlight,
  children,
  className = '',
}: CardProps) {
  return (
    <section className={`card ${highlight ? 'card--highlight' : ''} ${className}`.trim()}>
      {title ? <h2>{title}</h2> : null}
      {description ? <p>{description}</p> : null}
      {children}
    </section>
  );
}
