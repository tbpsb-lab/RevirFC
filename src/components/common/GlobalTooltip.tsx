import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipData {
  text: string;
  desc?: string;
  targetRect: DOMRect;
  side: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

/**
 * GlobalTooltip
 * 
 * Masaüstü fare imleci ve iPad Apple Pencil / tablet stylus hover hareketlerini
 * evrensel olarak dinler. Sitedeki tüm [title] ve [data-tooltip] öğeleri için
 * lüks, koyu temalı, cam efektli yüzen açıklamayı (tooltip) ekran dışına taşmayacak
 * şekilde render eder.
 */
export const GlobalTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const isWarmRef = useRef(false);

  useEffect(() => {
    // Mobil/tablet parmak dokunması (touch tap) hariç; Apple Pencil (pen) ve fare (mouse) hover'larını kabul et
    const isHoverPointer = (pointerType: string) => pointerType === 'pen' || pointerType === 'mouse' || (pointerType !== 'touch' && pointerType !== '');

    const clearTooltip = () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      currentTargetRef.current = null;
      setTooltip(null);
    };

    const handlePointerOver = (e: PointerEvent) => {
      if (!isHoverPointer(e.pointerType)) {
        clearTooltip();
        return;
      }

      const target = (e.target as Element | null)?.closest<HTMLElement>('[data-tooltip], [title]');
      if (!target) {
        // Eğer tooltip barındırmayan bir öğeye geçildiyse
        if (currentTargetRef.current && !currentTargetRef.current.contains(e.target as Node)) {
          clearTooltip();
          isWarmRef.current = false;
        }
        return;
      }

      // Aynı öğenin çocukları arasında geziniliyorsa tooltip'i sıfırlama
      if (currentTargetRef.current === target) {
        return;
      }

      // Tarayıcının varsayılan ham/çirkin desktop tooltip'ini engellemek için title -> data-tooltip'e aktar
      if (target.hasAttribute('title')) {
        const rawTitle = target.getAttribute('title')?.trim();
        if (rawTitle) {
          target.setAttribute('data-tooltip', rawTitle);
          if (!target.hasAttribute('aria-label')) {
            target.setAttribute('aria-label', rawTitle);
          }
          target.removeAttribute('title');
        }
      }

      const text = target.getAttribute('data-tooltip')?.trim();
      if (!text) {
        clearTooltip();
        return;
      }

      const desc = target.getAttribute('data-tooltip-desc')?.trim() || undefined;
      const side = (target.getAttribute('data-tooltip-side') as TooltipData['side']) || 'auto';

      currentTargetRef.current = target;

      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
      }

      const showAction = () => {
        if (!currentTargetRef.current || !currentTargetRef.current.isConnected) {
          clearTooltip();
          return;
        }
        const rect = currentTargetRef.current.getBoundingClientRect();
        // Görünür olmayan veya ekrandan çıkmış öğeleri ele
        if (rect.width === 0 && rect.height === 0) {
          clearTooltip();
          return;
        }
        setTooltip({
          text,
          desc,
          targetRect: rect,
          side,
        });
        isWarmRef.current = true;
      };

      // Zaten bir tooltip aktifken başka bir tooltip'e geçiliyorsa gecikmesiz göster (warm)
      // İlk hover'da hızlı 70ms bekleme ile kazara hızlı el hareketlerinde titreme olmasını engelle
      if (isWarmRef.current) {
        showAction();
      } else {
        showTimerRef.current = window.setTimeout(showAction, 70);
      }
    };

    const handlePointerOut = (e: PointerEvent) => {
      if (!currentTargetRef.current) return;
      const related = e.relatedTarget as Node | null;
      if (!related || !currentTargetRef.current.contains(related)) {
        clearTooltip();
      }
    };

    const handlePointerDown = () => {
      // Tıklama anında veya dokunulduğunda hemen kapat
      clearTooltip();
      isWarmRef.current = false;
    };

    const handleScroll = () => {
      // Sayfa kaydırılırken kapat
      clearTooltip();
      isWarmRef.current = false;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isHoverPointer(e.pointerType)) return;
      if (!currentTargetRef.current) {
        handlePointerOver(e);
      }
    };

    window.addEventListener('pointerover', handlePointerOver, { capture: true, passive: true });
    window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
    window.addEventListener('pointerout', handlePointerOut, { capture: true, passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('pointercancel', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('blur', clearTooltip);

    return () => {
      window.removeEventListener('pointerover', handlePointerOver, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerout', handlePointerOut, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('pointercancel', handlePointerDown, { capture: true });
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('blur', clearTooltip);
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
      }
    };
  }, []);

  if (!tooltip || typeof document === 'undefined') return null;

  const { text, desc, targetRect, side } = tooltip;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Pozisyonlama matematiği
  let chosenSide = side;
  if (chosenSide === 'auto') {
    if (targetRect.left < 85) {
      chosenSide = 'right';
    } else if (targetRect.top < 70) {
      chosenSide = 'bottom';
    } else {
      chosenSide = 'top';
    }
  }

  // Ekran sınırlarına çarpma koruması (auto flip)
  if (chosenSide === 'top' && targetRect.top < 65) {
    chosenSide = 'bottom';
  } else if (chosenSide === 'bottom' && targetRect.bottom > viewportHeight - 65) {
    chosenSide = 'top';
  } else if (chosenSide === 'right' && targetRect.right + 260 > viewportWidth) {
    chosenSide = targetRect.top < 70 ? 'bottom' : 'top';
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 99999,
  };

  if (chosenSide === 'right') {
    style.top = Math.max(12, Math.min(viewportHeight - 20, targetRect.top + targetRect.height / 2));
    style.left = Math.min(viewportWidth - 16, targetRect.right + 10);
    style.transform = 'translateY(-50%)';
  } else if (chosenSide === 'left') {
    style.top = Math.max(12, Math.min(viewportHeight - 20, targetRect.top + targetRect.height / 2));
    style.right = Math.max(12, viewportWidth - targetRect.left + 10);
    style.transform = 'translateY(-50%)';
  } else if (chosenSide === 'bottom') {
    style.top = Math.min(viewportHeight - 20, targetRect.bottom + 8);
    style.left = Math.max(16, Math.min(viewportWidth - 16, targetRect.left + targetRect.width / 2));
    style.transform = 'translateX(-50%)';
  } else {
    // top
    style.bottom = Math.max(12, viewportHeight - targetRect.top + 8);
    style.left = Math.max(16, Math.min(viewportWidth - 16, targetRect.left + targetRect.width / 2));
    style.transform = 'translateX(-50%)';
  }

  return createPortal(
    <div
      style={style}
      className="max-w-[280px] sm:max-w-xs px-3 py-1.5 rounded-xl bg-neutral-900/98 backdrop-blur-xl border border-neutral-700/90 shadow-[0_12px_32px_rgba(0,0,0,0.85)] text-left select-none transition-all duration-150 animate-in fade-in zoom-in-95"
    >
      <p className="text-xs font-black text-white leading-tight tracking-wide whitespace-pre-line">
        {text}
      </p>
      {desc && (
        <p className="text-[11px] font-medium text-amber-300/90 mt-0.5 leading-snug">
          {desc}
        </p>
      )}
    </div>,
    document.body
  );
};
