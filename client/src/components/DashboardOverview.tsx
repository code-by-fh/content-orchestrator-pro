import { useQuery } from '@tanstack/react-query';
import { getArticles } from '../api';
import { motion } from 'framer-motion';
import { GlassCard } from './ui/GlassCard';
import { FileText, CheckCircle, Clock, Zap, ArrowRight, BarChart3, UploadCloud, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlowButton } from './ui/GlowButton';
import { Button } from './ui/Button';
import { RSSFeedCard } from './RSSFeedCard';
import { cn } from '../lib/utils';

export const DashboardOverview = () => {
    const { data: articles, isLoading } = useQuery({
        queryKey: ['articles'],
        queryFn: getArticles,
    });

    // Calculate stats
    const totalArticles = articles?.length || 0;
    const publishedCount = articles?.filter(a => a.status === 'PUBLISHED').length || 0;
    const draftCount = articles?.filter(a => a.status !== 'PUBLISHED').length || 0;

    // Find next scheduled article
    const nextScheduledArticle = articles
        ?.filter(a => a.status === 'SCHEDULED' && a.scheduledAt)
        .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];

    const stats = [
        {
            label: "Total Articles",
            value: totalArticles,
            icon: FileText,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            border: "border-indigo-500/20"
        },
        {
            label: "Published",
            value: publishedCount,
            icon: CheckCircle,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            border: "border-emerald-500/20"
        },
        {
            label: "In Progress",
            value: draftCount,
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            border: "border-amber-500/20"
        }
    ];

    if (nextScheduledArticle && nextScheduledArticle.scheduledAt) {
        stats.push({
            label: "Next Scheduled",
            value: new Date(nextScheduledArticle.scheduledAt).toLocaleDateString(),
            icon: Calendar,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        } as any);
    }

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
                    <p className="text-muted-foreground">Welcome back to your creative command center.</p>
                </div>
                <div className="flex gap-4">
                    <Link to="/dashboard/articles">
                        <GlowButton>
                            Create Content <Zap className="w-4 h-4 ml-2" />
                        </GlowButton>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className={cn(
                "grid gap-6",
                stats.length > 3
                    ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                    : "grid-cols-1 md:grid-cols-3"
            )}>
                {stats.map((stat, index) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-6 rounded-2xl border ${stat.border} ${stat.bg} backdrop-blur-sm relative overflow-hidden group`}
                    >
                        <div className="flex justify-between items-start relative z-10">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                                <h3 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight truncate">
                                    {isLoading ? "-" : stat.value}
                                </h3>
                            </div>
                            <div className={`p-3 rounded-xl bg-background/50 ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions & Tips Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <RSSFeedCard />

                <GlassCard className="p-6 flex flex-col justify-center items-center text-center space-y-4 border-border">
                    <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 ring-4 ring-purple-500/5">
                        <UploadCloud className="w-7 h-7" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">Import Content</h3>
                        <p className="text-sm text-muted-foreground">Import directly from Medium or YouTube</p>
                    </div>
                    <Link to="/dashboard/articles" className="w-full pt-2">
                        <Button variant="outline" className="w-full">Go to Imports</Button>
                    </Link>
                </GlassCard>

                <GlassCard className="p-6 space-y-5 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-amber-500" />
                        <h2 className="font-semibold text-foreground">Quick Tips</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <h3 className="font-medium text-foreground text-sm">Content Strategy</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Consistency is key. Try to publish at least one article per week.
                            </p>
                        </div>
                        <div className="h-px bg-border/50" />
                        <div className="space-y-1">
                            <h3 className="font-medium text-foreground text-sm">Did you know?</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                You can paste YouTube links directly to generate summarized articles.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Recent Activity Full Width */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        Recent Activity
                    </h2>
                    <Link to="/dashboard/articles" className="text-sm text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors">
                        View all <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {isLoading ? (
                        <div className="col-span-full text-center py-10 text-muted-foreground">Loading activity...</div>
                    ) : articles?.slice(0, 6).map((article, i) => (
                        <motion.div
                            key={article.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + (i * 0.05) }}
                        >
                            <Link to={`/dashboard/editor/${article.id}`}>
                                <GlassCard className="p-4 flex flex-col gap-3 group hover:bg-muted/50 transition-colors cursor-pointer border-border relative overflow-hidden h-full">
                                    {/* Hover effect highlight */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                    <div className="flex justify-between items-start">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${article.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'
                                            }`}>
                                            <FileText size={18} />
                                        </div>
                                        <div className={`text-[10px] px-2 py-0.5 rounded-full border ${article.status === 'PUBLISHED'
                                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                            }`}>
                                            {article.status}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-medium text-foreground truncate group-hover:text-indigo-500 transition-colors mb-1">
                                            {article.title || 'Untitled Draft'}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Edited {new Date(article.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </GlassCard>
                            </Link>
                        </motion.div>
                    ))}
                    {articles?.length === 0 && (
                        <div className="col-span-full p-8 text-center border border-dashed border-border rounded-xl bg-card/50">
                            <p className="text-muted-foreground">No recent activity. Start creating!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
