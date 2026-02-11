import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getArticles, createArticle, deleteArticle, updateArticle } from '../api';
import { Link } from 'react-router-dom';
import { Plus, Youtube, FileText, Loader2, Clock, CheckCircle, AlertCircle, RefreshCw, Trash2, Calendar } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/utils';
import type { ArticleStatus } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const StatusIndicator = ({ status }: { status: ArticleStatus }) => {
    switch (status) {
        case 'COMPLETED': return <CheckCircle size={16} className="text-emerald-500" />;
        case 'PROCESSING': return <RefreshCw size={16} className="text-indigo-500 animate-spin" />;
        case 'SCHEDULED': return <Calendar size={16} className="text-blue-500" />;
        case 'ERROR': return <AlertCircle size={16} className="text-red-500" />;
        default: return <Clock size={16} className="text-muted-foreground" />;
    }
};

export const ArticleList: React.FC = () => {
    const queryClient = useQueryClient();
    const [url, setUrl] = useState('');
    // Removed manual type selection state since it's now auto-detected

    const { data: articles, isLoading } = useQuery({
        queryKey: ['articles'],
        queryFn: getArticles,
        refetchInterval: (query) => {
            const hasActiveJobs = query.state.data?.some(a => a.status === 'PROCESSING' || a.status === 'QUEUED');
            return hasActiveJobs ? 3000 : false;
        }
    });

    const createMutation = useMutation({
        mutationFn: (variables: { url: string, type: 'YOUTUBE' | 'MEDIUM' }) => createArticle(variables.url, variables.type),
        onMutate: () => {
            toast.loading("Starting content generation...", { id: "create-article" });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            setUrl('');
            toast.success("Content generation started!", { id: "create-article" });
        },
        onError: (error) => {
            toast.error(`Failed to start generation: ${error.message}`, { id: "create-article" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteArticle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            toast.success("Article deleted successfully");
        },
        onError: () => {
            toast.error("Failed to delete article");
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        let detectedType: 'YOUTUBE' | 'MEDIUM' | null = null;

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            detectedType = 'YOUTUBE';
        } else if (url.includes('medium.com')) {
            detectedType = 'MEDIUM';
        }

        if (!detectedType) {
            toast.error("Invalid URL. Only YouTube and Medium links are supported.");
            return;
        }

        createMutation.mutate({ url, type: detectedType });
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12">
            {/* Minimalist Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight glow-text">Content Studio</h1>
                <p className="text-muted-foreground text-lg">Create, manage, and publish your content.</p>
            </div>

            {/* Input Area */}
            <div className="relative group w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex items-center bg-card/50 backdrop-blur-xl rounded-xl p-2 border border-white/10 shadow-2xl">
                    <input
                        type="text"
                        placeholder="Paste YouTube or Medium URL here..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1 bg-transparent border-none px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0"
                    />
                    <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || !url}
                        className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-6 shadow-lg shadow-indigo-500/20 transition-all"
                    >
                        {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                        <span className="ml-2">Generate</span>
                    </Button>
                </div>
            </div>

            {/* Article List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Library</h3>
                    <span className="text-xs text-muted-foreground">{articles?.length || 0} items</span>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-20 w-full bg-muted/50 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 w-full">
                        <AnimatePresence mode='popLayout'>
                            {articles?.map((article, i) => (
                                <motion.div
                                    key={article.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="w-full"
                                    layout
                                >
                                    <Link
                                        to={`/dashboard/editor/${article.id}`}
                                        className="group block w-full relative"
                                    >
                                        <div className="absolute -inset-px bg-gradient-to-r from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 rounded-xl transition-all duration-500" />
                                        <div className="relative flex items-center justify-between p-5 bg-card/40 border border-white/5 hover:border-white/10 rounded-xl backdrop-blur-sm transition-all hover:translate-x-1 w-full overflow-hidden">
                                            <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                                    article.sourceUrl?.includes('youtu') ? "bg-red-500/10 text-red-500" : "bg-white/10 text-foreground"
                                                )}>
                                                    {article.sourceUrl?.includes('youtu') ? <Youtube size={18} /> : <FileText size={18} />}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-foreground truncate group-hover:text-indigo-400 transition-colors">{article.title || 'Untitled Article'}</h4>
                                                    <p className="text-xs text-muted-foreground truncate">{article.slug || 'Processing...'}</p>
                                                    {article.status === 'SCHEDULED' && article.scheduledAt && (
                                                        <p className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                                                            <Calendar size={10} />
                                                            Scheduled: {new Date(article.scheduledAt).toLocaleString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 shrink-0 pl-4">
                                                <div className="flex items-center gap-2 text-xs font-medium bg-secondary/50 px-2.5 py-1 rounded-full border border-white/5">
                                                    <StatusIndicator status={article.status} />
                                                    <span className="capitalize">{article.status.toLowerCase()}</span>
                                                </div>
                                                <span className="text-xs text-muted-foreground w-20 text-right">
                                                    {new Date(article.createdAt).toLocaleDateString()}
                                                </span>
                                                <ArticleActions
                                                    article={article}
                                                    onDelete={(id) => deleteMutation.mutate(id)}
                                                />
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {articles?.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-20 border border-dashed border-border rounded-xl bg-card/20"
                            >
                                <p className="text-muted-foreground">It's quiet here. Start creating!</p>
                            </motion.div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ArticleActions = ({ article, onDelete }: { article: any, onDelete: (id: string) => void }) => {
    const queryClient = useQueryClient();
    const updateMutation = useMutation({
        mutationFn: (variables: { id: string, status: ArticleStatus }) => updateArticle(variables.id, { status: variables.status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            toast.success("Article unpublished successfully");
        },
        onError: () => {
            toast.error("Failed to unpublish article");
        }
    });

    return (
        <div className="flex items-center gap-1">
            {article.status === 'PUBLISHED' && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 z-10 relative" // added relative/z-10 to ensure clickable
                    title="Unpublish"
                    disabled={updateMutation.isPending}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (confirm('Unpublish this article? output will be reverted to draft.')) {
                            updateMutation.mutate({ id: article.id, status: 'DRAFT' });
                        }
                    }}
                >
                    {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Loader2 size={16} className="rotate-180" />}
                </Button>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 relative"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this article?')) {
                        onDelete(article.id);
                    }
                }}
            >
                <Trash2 size={16} />
            </Button>
        </div>
    );
};
