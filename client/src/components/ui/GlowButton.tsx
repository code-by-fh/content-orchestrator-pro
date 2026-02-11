import { cn } from "@/lib/utils";
import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";

interface GlowButtonProps extends HTMLMotionProps<"button"> {
    children: React.ReactNode;
    variant?: "primary" | "secondary" | "ghost";
    className?: string;
}

export const GlowButton = React.forwardRef<HTMLButtonElement, GlowButtonProps>(
    ({ children, className, variant = "primary", ...props }, ref) => {
        const variants = {
            primary: "bg-primary text-primary-foreground hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] border-primary/50",
            secondary: "bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 border-white/10",
            ghost: "bg-transparent hover:bg-white/5 text-foreground/80 hover:text-foreground",
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "relative inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-colors border cursor-pointer",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    variants[variant],
                    className
                )}
                {...props}
            >
                {/* Shine effect on hover */}
                {variant === 'primary' && (
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-0 pointer-events-none" />
                )}
                <span className="relative z-10 flex items-center gap-2">{children}</span>
            </motion.button>
        );
    }
);

GlowButton.displayName = "GlowButton";
