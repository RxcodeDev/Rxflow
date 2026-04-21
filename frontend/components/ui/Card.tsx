import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={`bg-[var(--c-bg)] border border-[var(--c-border)] rounded-[1.25rem] ${className ?? ''}`}
      {...props}
    >
      {children}
    </div>
  );
}
