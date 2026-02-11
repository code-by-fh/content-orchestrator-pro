import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (dateTime: Date) => void;
    currentScheduledAt?: string;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
    isOpen,
    onClose,
    onSchedule,
    currentScheduledAt
}) => {
    const [dateTimeValue, setDateTimeValue] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (currentScheduledAt) {
                // Convert UTC to local datetime-local format
                const date = new Date(currentScheduledAt);
                const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                setDateTimeValue(localDateTime);
            } else {
                // Default to 1 hour from now
                const date = new Date();
                date.setHours(date.getHours() + 1);
                const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                setDateTimeValue(localDateTime);
            }
            setError('');
        }
    }, [isOpen, currentScheduledAt]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!dateTimeValue) {
            setError('Please select a date and time');
            return;
        }

        const selectedDate = new Date(dateTimeValue);
        const now = new Date();

        if (selectedDate <= now) {
            setError('Scheduled time must be in the future');
            return;
        }

        onSchedule(selectedDate);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-card border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 backdrop-blur-xl"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                <Calendar className="text-indigo-500" size={20} />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Schedule Publishing</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Publish Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={dateTimeValue}
                                onChange={(e) => {
                                    setDateTimeValue(e.target.value);
                                    setError('');
                                }}
                                className="flex h-12 w-full rounded-xl border border-white/10 bg-background/50 px-4 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Your local timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                            >
                                Schedule
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
