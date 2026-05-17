/* ── Avatar — patrón Sidebar: imagen real, o inicial con color + dot de presencia ── */
export type Presence = 'online' | 'away' | 'offline';

export const PRESENCE_COLOR: Record<Presence, string> = {
  online: 'var(--c-success)',
  away: '#f59e0b',
  offline: 'var(--c-muted)',
};

interface AvatarProps {
  name: string;
  initials: string;
  url?: string | null;
  color?: string | null;
  presence?: Presence;
  /** Pixel size of the avatar (default 26) */
  size?: number;
  /** Ring/border color — usually the surface it sits on (default var(--c-bg)) */
  ring?: string;
}

export default function Avatar({
  name,
  initials,
  url,
  color,
  presence,
  size = 26,
  ring = 'var(--c-bg)',
}: AvatarProps) {
  const dot = Math.max(7, Math.round(size * 0.32));
  return (
    <span className="relative inline-flex shrink-0" title={name} style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          style={{ border: `2px solid ${ring}` }}
        />
      ) : (
        <span
          className="w-full h-full rounded-full flex items-center justify-center font-semibold text-[var(--c-bg)]"
          style={{
            background: color || 'var(--c-text)',
            border: `2px solid ${ring}`,
            fontSize: Math.round(size * 0.36),
          }}
        >
          {initials}
        </span>
      )}
      {presence && (
        <span
          className="absolute bottom-0 right-0 rounded-full"
          title={presence}
          style={{ width: dot, height: dot, background: PRESENCE_COLOR[presence], border: `2px solid ${ring}` }}
        />
      )}
    </span>
  );
}
