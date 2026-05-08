'use client';

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/core';
import { useCallback, useRef, useState } from 'react';

// ── NodeView ──────────────────────────────────────────────────────────────────

function ResizableImageView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [resizing, setResizing] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const liveWidthRef = useRef<number | null>(null);

  const width = (node.attrs.width as number | null) ?? null;
  const src = node.attrs.src as string;
  const alt = (node.attrs.alt as string) ?? '';
  const displayWidth = liveWidth ?? width;

  /* ── resize drag ──────────────────────────────────────────────────────── */
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = imgRef.current?.offsetWidth ?? displayWidth ?? 300;
    setResizing(true);

    const onMove = (me: MouseEvent) => {
      const newW = Math.max(60, Math.round(startW + (me.clientX - startX)));
      liveWidthRef.current = newW;
      setLiveWidth(newW);
    };
    const onUp = () => {
      setResizing(false);
      setLiveWidth(null);
      if (liveWidthRef.current !== null) updateAttributes({ width: liveWidthRef.current });
      liveWidthRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [updateAttributes, displayWidth]);

  /* ── quick-size helpers ───────────────────────────────────────────────── */
  const proseMirrorWidth = () =>
    ((editor?.view?.dom as HTMLElement | undefined)?.offsetWidth ?? 0) - 32;

  const setNatural  = () => updateAttributes({ width: null });
  const setHalfW    = () => { const w = proseMirrorWidth(); if (w > 0) updateAttributes({ width: Math.floor(w / 2) }); };
  const setFullW    = () => { const w = proseMirrorWidth(); if (w > 0) updateAttributes({ width: w }); };

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      style={{
        display: 'inline-block',
        verticalAlign: 'bottom',
        userSelect: 'none',
        position: 'relative',
        lineHeight: 0,
      }}
    >
      {/* Floating toolbar above image */}
      {selected && !resizing && (
        <span
          style={{
            position: 'absolute',
            top: -38,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            background: 'var(--c-surface, #fff)',
            border: '1px solid var(--c-border)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
            padding: '3px 5px',
            gap: 2,
            zIndex: 30,
            whiteSpace: 'nowrap',
          }}
        >
          {([
            { label: 'Original', action: setNatural },
            { label: '½ ancho',   action: setHalfW },
            { label: 'Completo',  action: setFullW },
          ] as const).map(btn => (
            <button
              key={btn.label}
              type="button"
              onMouseDown={e => { e.preventDefault(); (btn.action as () => void)(); }}
              style={{
                padding: '2px 9px',
                borderRadius: 5,
                border: 'none',
                background: 'transparent',
                color: 'var(--c-text-sub, #666)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                lineHeight: '1.6',
              }}
            >
              {btn.label}
            </button>
          ))}
        </span>
      )}

      {/* Image + handle wrapper */}
      <span style={{ display: 'inline-block', position: 'relative', lineHeight: 0 }}>
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          style={{
            display: 'inline-block',
            verticalAlign: 'bottom',
            width: displayWidth ? `${displayWidth}px` : 'auto',
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '0.5rem',
            border: selected ? '2px solid #6366f1' : '1px solid var(--c-border)',
            boxShadow: selected ? '0 0 0 4px rgba(99,102,241,0.15)' : 'none',
            transition: resizing ? 'none' : 'border-color 0.15s, box-shadow 0.15s',
          }}
        />

        {/* Right edge handle — sits ON the image border, fully visible */}
        {selected && (
          <span
            onMouseDown={startResize}
            title="Arrastrar para redimensionar"
            style={{
              position: 'absolute',
              top: '50%',
              right: -6,
              transform: 'translateY(-50%)',
              width: 12,
              height: 48,
              borderRadius: 6,
              background: '#6366f1',
              cursor: 'ew-resize',
              zIndex: 20,
              boxShadow: '0 0 0 2.5px #fff, 0 0 0 4px #6366f1',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            {/* Grip dots */}
            {[0, 1, 2].map(i => (
              <span key={i} style={{
                width: 3, height: 3, borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)', display: 'block',
              }} />
            ))}
          </span>
        )}

        {/* Width badge while resizing */}
        {resizing && displayWidth && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              borderRadius: 7,
              padding: '5px 12px',
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              zIndex: 25,
              pointerEvents: 'none',
              letterSpacing: '0.02em',
            }}
          >
            {displayWidth}px
          </span>
        )}
      </span>
    </NodeViewWrapper>
  );
}

// ── Extension ─────────────────────────────────────────────────────────────────

export const ResizableImage = Image.extend({
  inline: true,
  group: 'inline',

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: el => {
          const w = el.style.width || el.getAttribute('width');
          return w ? parseInt(w) : null;
        },
        renderHTML: attrs =>
          attrs.width
            ? { style: `width:${attrs.width}px; max-width:100%; display:inline-block; vertical-align:bottom` }
            : {},
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
