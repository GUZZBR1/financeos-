import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ButtonRippleEffect() {
  const [ripple, setRipple] = useState(null);
  useEffect(() => {
    const handlePointerDown = (event) => {
      const button = event.target.closest('button');
      if (!button || button.disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2.2;
      setRipple({ id: Date.now(), rect, size, x: event.clientX - rect.left, y: event.clientY - rect.top, radius: getComputedStyle(button).borderRadius });
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);
  if (!ripple) return null;
  return createPortal(
    <span aria-hidden="true" style={{ position: 'fixed', pointerEvents: 'none', overflow: 'hidden', zIndex: 2147483647, left: ripple.rect.left, top: ripple.rect.top, width: ripple.rect.width, height: ripple.rect.height, borderRadius: ripple.radius }}>
      <span key={ripple.id} className="button-ripple" onAnimationEnd={() => setRipple(null)} style={{ width: ripple.size, height: ripple.size, left: ripple.x - ripple.size / 2, top: ripple.y - ripple.size / 2 }} />
    </span>,
    document.body,
  );
}
