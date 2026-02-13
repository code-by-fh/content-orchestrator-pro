import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ModalVariant;
    isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'info',
    isLoading = false
}) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger': return <AlertTriangle className="text-red-500" size={24} />;
            case 'warning': return <AlertTriangle className="text-amber-500" size={24} />;
            case 'success': return <CheckCircle2 className="text-emerald-500" size={24} />;
            default: return <Info className="text-indigo-500" size={24} />;
        }
    };

    const getConfirmButtonStyle = () => {
        switch (variant) {
            case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-500/20';
            case 'warning': return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';
            case 'success': return 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20';
            default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden p-6"
                    >
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "p-3 rounded-full shrink-0",
                                variant === 'danger' && "bg-red-500/10",
                                variant === 'warning' && "bg-amber-500/10",
                                variant === 'success' && "bg-emerald-500/10",
                                variant === 'info' && "bg-indigo-500/10",
                            )}>
                                {getIcon()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mt-8">
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1 h-11"
                                disabled={isLoading}
                            >
                                {cancelLabel}
                            </Button>
                            <Button
                                onClick={(e) => {
                                    e.preventDefault();
                                    onConfirm();
                                }}
                                className={cn(
                                    "flex-1 h-11 text-white shadow-lg transition-all",
                                    getConfirmButtonStyle()
                                )}
                                disabled={isLoading}
                            >
                                {isLoading ? "Processing..." : confirmLabel}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
