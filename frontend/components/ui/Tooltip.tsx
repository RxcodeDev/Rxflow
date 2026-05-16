'use client';
import { useState, useRef, cloneElement } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  icon?: React.ReactNode;
  side?: Side;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}

export default function Tooltip({ content, icon, side = 'top', children }: TooltipProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement>(null);

  function handleEnter() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const GAP = 8;
    let top = 0, left = 0;
    switch (side) {
      case 'top':    top = r.top - GAP;            left = r.left + r.width / 2;  break;
      case 'bottom': top = r.bottom + GAP;          left = r.left + r.width / 2;  break;
      case 'left':   top = r.top + r.height / 2;   left = r.left - GAP;          break;
      case 'right':  top = r.top + r.height / 2;   left = r.right + GAP;         break;
    }
    setPos({ top, left });
  }

  const transformMap: Record<Side, string> = {
    top:    'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left:   'translate(-100%, -50%)',
    right:  'translate(0, -50%)',
  };

  const arrowBase = 'absolute w-0 h-0 pointer-events-none';
  const arrowStyle: Record<Side, React.CSSProperties> = {
    top: {
      top: '100%', left: '50%', transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
      borderTop: '5px solid var(--c-border)',
    },
    bottom: {
      bottom: '100%', left: '50%', transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
      borderBottom: '5px solid var(--c-border)',
    },
    left: {
      left: '100%', top: '50%', transform: 'translateY(-50%)',
      borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
      borderLeft: '5px solid var(--c-border)',
    },
    right: {
      right: '100%', top: '50%', transform: 'translateY(-50%)',
      borderTop: '5px solid transparent', borderBottom: '5px solid transparent',
      borderRight: '5px solid var(--c-border)',
    },
  };

  const trigger = cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      handleEnter();
      children.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      setPos(null);
      children.props.onMouseLeave?.(e);
    },
  } as React.HTMLAttributes<HTMLElement> & { ref: React.Ref<HTMLElement> });

  return (
    <>
      {trigger}
      {pos && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none border border-[var(--c-border)] shadow-sm"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: transformMap[side],
            background: 'var(--c-bg)',
            color: 'var(--c-text)',
            zIndex: 9999,
          }}
        >
          <span className={arrowBase} style={arrowStyle[side]} />
          {icon && <span className="shrink-0 text-[var(--c-text-sub)]">{icon}</span>}
          {content}
        </div>
      )}
    </>
  );
}
