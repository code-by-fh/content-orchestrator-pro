import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

interface GlassCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ children, className, hoverEffect = true, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={cn(
                    "glass-panel rounded-2xl p-6 relative overflow-hidden group",
                    hoverEffect && "glass-card-hover",
                    className
                )}
                {...props}
            >
                {/* Subtle gradient blob for internal glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

                {children}
            </motion.div>
        );
    }
);

GlassCard.displayName = "GlassCard";
