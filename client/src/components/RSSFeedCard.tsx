import { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Rss, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export const RSSFeedCard = () => {
    const [copied, setCopied] = useState(false);

    const getRssUrl = () => {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3003/api";
        return `${apiUrl.replace(/\/$/, '')}/rss`;
    };
    const feedUrl = getRssUrl();

    const handleCopy = () => {
        navigator.clipboard.writeText(feedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <GlassCard className="p-6 flex flex-col justify-center items-center text-center space-y-4 border-border relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-colors" />

            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 ring-4 ring-orange-500/5 z-10">
                <Rss className="w-7 h-7" />
            </div>

            <div className="space-y-1 z-10">
                <h3 className="font-semibold text-foreground">RSS Feed</h3>
                <p className="text-sm text-muted-foreground">Your content is available automatically.</p>
            </div>

            <div className="w-full flex items-center gap-2 p-2 bg-background/40 rounded-lg border border-border/50 z-10">
                <code className="text-xs text-muted-foreground flex-1 truncate text-left px-2 font-mono">
                    {feedUrl}
                </code>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={handleCopy}
                >
                    <AnimatePresence mode='wait'>
                        {copied ? (
                            <motion.div
                                key="check"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                            >
                                <Check size={14} className="text-emerald-500" />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="copy"
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0 }}
                            >
                                <Copy size={14} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Button>
            </div>

            <a
                href={feedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
            >
                <Button variant="outline" className="w-full gap-2 text-xs group-hover:border-orange-500/30 transition-colors">
                    Open Feed <ExternalLink size={12} />
                </Button>
            </a>
        </GlassCard>
    );
};
