import React, { useEffect, useMemo, useRef, useState } from 'react';

export function AvatarCarousel({ avatars, title, subtitle, backHint }) {
  const containerRef = useRef(null);
  const originalWidthRef = useRef(0);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [isPaused, setIsPaused] = useState(false);

  const loopAvatars = useMemo(() => {
    if (!avatars || avatars.length === 0) return [];
    // Quadruplicate to ensure smooth infinite scrolling even on huge screens
    return [...avatars, ...avatars, ...avatars, ...avatars];
  }, [avatars]);

  const expandedAvatar = useMemo(() => {
    if (expandedIndex === null) return null;
    return avatars?.[expandedIndex] ?? null;
  }, [avatars, expandedIndex]);

  // Handle infinite scroll logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!avatars || avatars.length === 0) return;

    let animationFrameId;
    let lastScrollLeft = container.scrollLeft;

    const scrollSpeed = 0.8; // Pixels per frame - adjust for speed

    const animate = () => {
      if (isPaused) {
        // Even when paused, we track scroll to handle manual infinite looping
        checkInfiniteLoop();
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      // Auto scroll
      container.scrollLeft += scrollSpeed;
      checkInfiniteLoop();
      
      animationFrameId = requestAnimationFrame(animate);
    };

    const checkInfiniteLoop = () => {
      // Calculate width of one set
      // We assume all cards are roughly same width + gap. 
      // Better: measure the first N elements (where N = original avatars count)
      // But simpler heuristic: totalScrollWidth / 4 (since we quadruplicated)
      
      const totalWidth = container.scrollWidth;
      const oneSetWidth = totalWidth / 4;
      
      // Reset if we've scrolled past the first set
      if (container.scrollLeft >= oneSetWidth * 2) {
        container.scrollLeft -= oneSetWidth;
      } 
      // Reset if we're too close to start (allow scrolling left)
      else if (container.scrollLeft < oneSetWidth) {
         container.scrollLeft += oneSetWidth;
      }
    };

    // Initial positioning: Start at set 2 to allow left scrolling immediately
    // Wait for layout
    const initScroll = () => {
       if (container.scrollWidth > 0 && container.scrollLeft === 0) {
           const totalWidth = container.scrollWidth;
           container.scrollLeft = totalWidth / 4;
       }
       animationFrameId = requestAnimationFrame(animate);
    };
    
    initScroll();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [avatars, isPaused]);

  const pause = () => setIsPaused(true);
  const resume = () => {
    if (expandedIndex === null) setIsPaused(false);
  };

  const toggleExpanded = (index) => {
    // Correct index mapping since we have 4 sets
    const realIndex = index % avatars.length;
    setExpandedIndex((prev) => {
      const next = prev === realIndex ? null : realIndex;
      if (next === null) setIsPaused(false);
      else setIsPaused(true);
      return next;
    });
  };

  const closeExpanded = () => {
    setExpandedIndex(null);
    setIsPaused(false);
  };

  return (
    <div className="py-16 z-10 relative">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4 tracking-tight">{title}</h2>
        <p className="text-gray-400 text-base max-w-2xl mx-auto px-4">{subtitle}</p>
      </div>

      <div
        ref={containerRef}
        className="flex overflow-x-auto gap-6 pb-8 no-scrollbar px-4 sm:px-0 select-none"
        onPointerDown={pause}
        onPointerUp={resume}
        onPointerCancel={resume}
        onMouseEnter={pause}
        onMouseLeave={resume}
      >
        {loopAvatars.map((avatar, index) => (
          <button
            key={`${avatar.src}-${index}`}
            type="button"
            data-avatar-card="true"
            onClick={() => toggleExpanded(index)}
            className="flex-shrink-0 min-w-[72%] w-[72%] sm:min-w-[240px] sm:w-[240px] md:min-w-[280px] md:w-[280px] lg:min-w-[320px] lg:w-[320px] bg-[#100c16]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center hover:border-pink-500/50 hover:-translate-y-2 transition-all duration-300 cursor-pointer group text-left"
          >
            <div className="w-full h-48 sm:h-44 md:h-48 bg-black/40 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10"></div>
              <img
                src={avatar.src}
                alt={avatar.name}
                className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://placehold.co/400x400/1a1a2e/e6155e?text=Avatar+${index + 1}`;
                }}
              />
            </div>
            <h4 className="font-bold text-white mb-1 text-center w-full truncate">{avatar.name}</h4>
            <span className="text-xs font-semibold text-pink-500 bg-pink-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
              {avatar.role}
            </span>
          </button>
        ))}
      </div>

      {expandedAvatar && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={closeExpanded}
          role="presentation"
        >
          <div
            className="w-full max-w-md sm:max-w-xl bg-[#100c16]/95 border border-white/10 rounded-3xl overflow-hidden shadow-2xl transform transition-transform duration-300 scale-100"
            onClick={(e) => {
              e.stopPropagation();
              closeExpanded();
            }}
            role="presentation"
          >
            <div className="relative w-full aspect-square sm:aspect-[4/3] bg-black/40">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              <img src={expandedAvatar.src} alt={expandedAvatar.name} className="absolute inset-0 w-full h-full object-cover" />
            </div>
            <div className="p-6 sm:p-8 text-center">
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{expandedAvatar.name}</h3>
              <div className="mt-3 inline-flex items-center justify-center">
                <span className="text-xs font-semibold text-pink-500 bg-pink-500/10 px-4 py-1.5 rounded-full uppercase tracking-wider border border-pink-500/20">
                  {expandedAvatar.role}
                </span>
              </div>
              <div className="mt-6 text-xs text-gray-400">{backHint}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
