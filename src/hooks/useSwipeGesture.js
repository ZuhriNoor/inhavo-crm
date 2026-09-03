import { useRef } from 'react';

/**
 * Hook to detect horizontal swipe gestures on touch devices (mobile and tablets).
 * 
 * @param {Object} options
 * @param {Function} [options.onSwipeLeft] - Triggered when swiping right-to-left (move to next)
 * @param {Function} [options.onSwipeRight] - Triggered when swiping left-to-right (move to previous)
 * @param {number} [options.minDistance=45] - Minimum horizontal travel in px
 * @param {number} [options.maxVerticalRatio=1.25] - deltaX must be at least this multiple of deltaY (prevents vertical scroll conflict)
 * @param {boolean} [options.enabled=true] - Whether gestures are currently active
 */
export const useSwipeGesture = ({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 45,
  maxVerticalRatio = 1.25,
  enabled = true,
}) => {
  const touchStartRef = useRef(null);

  const handleTouchStart = (e) => {
    if (!enabled) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e) => {
    if (!enabled || !touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;

    // Reset touch start
    touchStartRef.current = null;

    // Only recognize fast and intentional swipes (under 800ms)
    if (duration > 800) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Ensure horizontal motion is dominant so normal vertical scrolling is never hijacked
    if (absX >= minDistance && absX > absY * maxVerticalRatio) {
      if (deltaX < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    }
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
};

export default useSwipeGesture;
