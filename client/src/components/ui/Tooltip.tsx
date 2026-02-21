import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

import { createPortal } from 'react-dom';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    delay?: number;
    side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, delay = 0.2, side = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    const updateCoords = React.useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let x = rect.left + rect.width / 2;
            let y = rect.top;

            if (side === 'top') {
                y = rect.top - 10;
            } else if (side === 'bottom') {
                y = rect.bottom + 10;
            } else if (side === 'left') {
                x = rect.left - 10;
                y = rect.top + rect.height / 2;
            } else if (side === 'right') {
                x = rect.right + 10;
                y = rect.top + rect.height / 2;
            }

            setCoords({ x, y });
        }
    }, [side]);


    useEffect(() => {
        if (isVisible) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isVisible, updateCoords]);


    return (
        <div
            ref={triggerRef}
            className="inline-flex"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: side === 'top' ? 5 : -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1, delay: delay }}
                        style={{
                            position: 'fixed',
                            top: coords.y,
                            left: coords.x,
                            transform: side === 'top' || side === 'bottom' ? 'translateX(-50%) translateY(' + (side === 'top' ? '-100%' : '0') + ')' : 'translateY(-50%) translateX(' + (side === 'left' ? '-100%' : '0') + ')',
                        }}
                        className={cn(
                            "px-3 py-1.5 bg-popover text-popover-foreground text-[11px] font-bold rounded-md shadow-2xl border border-border/50 whitespace-nowrap z-[100] pointer-events-none uppercase tracking-wider",
                            "backdrop-blur-md bg-opacity-90"
                        )}
                    >
                        {content}
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};
