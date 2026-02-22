import React, { useState, useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { getArticles, createArticle, deleteArticle, updateArticle, unpublishAllFromArticle, reprocessArticle } from '../api';
import { Link } from 'react-router-dom';
import { Plus, Youtube, FileText, Loader2, Clock, CheckCircle, Trash2, Calendar, Search, Filter, AlertCircle, Play, Undo2, Linkedin, Share2, Globe, Rss } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';
// import type { ArticleStatus } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { Tooltip } from './ui/Tooltip';


export const ArticleList: React.FC = () => {
    const queryClient = useQueryClient();
    const [url, setUrl] = useState('');
    const [confirmDeleteItem, setConfirmDeleteItem] = useState<{ id: string, isPublished: boolean, isScheduled: boolean } | null>(null);
    const [confirmUnpublishItem, setConfirmUnpublishItem] = useState<{ id: string } | null>(null);
    const [confirmReprocessItem, setConfirmReprocessItem] = useState<{ id: string } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlyPublished, setShowOnlyPublished] = useState(false);

    // Add custom debounce hook logic
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['articles', debouncedSearchQuery, showOnlyPublished],
        queryFn: ({ pageParam = 1 }) => getArticles(pageParam as number, 10, debouncedSearchQuery, showOnlyPublished),
        getNextPageParam: (lastPage) => lastPage.meta.nextPage,
        initialPageParam: 1,
    });

    const { ref: inViewRef, inView } = useInView();

    useEffect(() => {
        if (inView && hasNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, fetchNextPage]);

    const filteredArticles = data?.pages.flatMap(page => page.data) || [];
    const articlesObject = data?.pages[0]; // just to check length if 0 later


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

    const updateMutation = useMutation({
        mutationFn: (variables: { id: string, status: string }) => updateArticle(variables.id, { status: variables.status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            toast.success("Article updated successfully");
        },
        onError: () => {
            toast.error("Failed to update article");
        }
    });

    const unpublishMutation = useMutation({
        mutationFn: (id: string) => unpublishAllFromArticle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            toast.success("Unpublished from all platforms");
        },
        onError: (error: any) => {
            toast.error(`Failed to unpublish: ${error.message}`);
        }
    });

    const reprocessMutation = useMutation({
        mutationFn: (id: string) => reprocessArticle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['articles'] });
            toast.success("Processing started");
        },
        onError: (error: any) => {
            toast.error(`Failed to start processing: ${error.message}`);
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
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 md:space-y-12">
            {/* Minimalist Header */}
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight glow-text">Content Studio</h1>
                <p className="text-muted-foreground text-sm md:text-lg">Create, manage, and publish your content.</p>
            </div>

            {/* Input Area */}
            <div className="relative group w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-600/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <div className="relative flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-card/50 backdrop-blur-xl rounded-xl p-2 border border-white/10 shadow-2xl">
                    <input
                        type="text"
                        placeholder="Paste YouTube or Medium URL here..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="flex-1 bg-transparent border-none px-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 min-w-0"
                    />
                    <Button
                        onClick={handleSubmit}
                        disabled={createMutation.isPending || !url}
                        className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 md:py-2 shadow-lg shadow-indigo-500/20 transition-all w-full md:w-auto justify-center"
                    >
                        {createMutation.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                        <span className="ml-2">Generate</span>
                    </Button>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search by title..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
                <Button
                    variant={showOnlyPublished ? "default" : "outline"}
                    onClick={() => setShowOnlyPublished(!showOnlyPublished)}
                    className={cn(
                        "gap-2 shrink-0 w-full sm:w-auto",
                        showOnlyPublished && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                    )}
                >
                    <Filter size={16} />
                    {showOnlyPublished ? 'All Articles' : 'Published Only'}
                </Button>
            </div>

            {/* Article List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Library</h3>
                    <span className="text-xs text-muted-foreground">{articlesObject?.meta?.total || 0} items</span>
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
                            {filteredArticles?.map((article, i) => (
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
                                        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between p-4 md:p-5 bg-card/40 border border-white/5 hover:border-white/10 rounded-xl backdrop-blur-sm transition-all hover:translate-x-0 md:hover:translate-x-1 w-full overflow-hidden">
                                            <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0 w-full">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                                                    article.sourceUrl?.includes('youtu') ? "bg-red-500/10 text-red-500" : "bg-white/10 text-foreground"
                                                )}>
                                                    {article.sourceUrl?.includes('youtu') ? <Youtube size={18} /> : <FileText size={18} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h4 className="font-semibold text-foreground truncate group-hover:text-indigo-400 transition-colors">{article.title || 'Untitled Article'}</h4>
                                                    <p className="text-xs text-muted-foreground truncate">{article.slug || 'Processing...'}</p>
                                                    {article.scheduledAt && !article.publications?.some(pub => pub.status === 'PUBLISHED') && (
                                                        <p className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                                                            <Calendar size={10} />
                                                            Scheduled: {new Date(article.scheduledAt).toLocaleString()}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        {article.publications?.filter(p => p.status === 'PUBLISHED').map((pub: any) => {
                                                            const getPlatformIcon = (platform: string) => {
                                                                switch (platform) {
                                                                    case 'LINKEDIN': return { icon: <Linkedin size={10} />, color: 'text-[#0077b5]', bg: 'bg-[#0077b5]/10' };
                                                                    case 'XING': return { icon: <Share2 size={10} />, color: 'text-[#026466]', bg: 'bg-[#026466]/10' };
                                                                    case 'RSS': return { icon: <Rss size={10} />, color: 'text-orange-500', bg: 'bg-orange-500/10' };
                                                                    case 'WEBHOOK': return { icon: <Globe size={10} />, color: 'text-blue-500', bg: 'bg-blue-500/10' };
                                                                    default: return { icon: <Globe size={10} />, color: 'text-muted-foreground', bg: 'bg-muted/30' };
                                                                }
                                                            };
                                                            const info = getPlatformIcon(pub.platform);
                                                            return (
                                                                <Tooltip key={pub.id} content={`Published on ${pub.platform} (${pub.language})`} side="top">
                                                                    <div className={cn("flex items-center justify-center h-5 w-5 rounded-full border border-white/5", info.bg, info.color)}>
                                                                        {info.icon}
                                                                    </div>
                                                                </Tooltip>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4 pl-0 md:pl-4 mt-4 md:mt-0 border-t md:border-t-0 border-white/5 pt-4 md:pt-0 shrink-0">
                                                <div className="flex items-center gap-2 text-xs font-medium bg-secondary/50 px-2.5 py-1 rounded-full border border-white/5">
                                                    {article.processingStatus === 'PROCESSING' || article.processingStatus === 'PENDING' ? (
                                                        <><Loader2 size={16} className="text-indigo-500 animate-spin" /><span className="capitalize">Processing</span></>
                                                    ) : article.processingStatus === 'FAILED' ? (
                                                        <><AlertCircle size={16} className="text-red-500" /><span className="capitalize">Failed</span></>
                                                    ) : article.publications?.some((pub: any) => pub.status === 'PUBLISHED') ? (
                                                        <><CheckCircle size={16} className="text-emerald-500" /><span className="capitalize">Published</span></>
                                                    ) : article.scheduledAt ? (
                                                        <><Calendar size={16} className="text-blue-500" /><span className="capitalize">Scheduled</span></>
                                                    ) : (
                                                        <><Clock size={16} className="text-muted-foreground" /><span className="capitalize">Draft</span></>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="hidden sm:inline">
                                                        {new Date(article.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <ArticleActions
                                                        article={article}
                                                        onDelete={() => setConfirmDeleteItem({ id: article.id, isPublished: !!article.publications?.some(pub => pub.status === 'PUBLISHED'), isScheduled: !!article.scheduledAt })}
                                                        onUnpublish={(id) => setConfirmUnpublishItem({ id })}
                                                        onReprocess={() => setConfirmReprocessItem({ id: article.id })}
                                                        isUnpublishing={unpublishMutation.isPending && unpublishMutation.variables === article.id}
                                                        isReprocessing={reprocessMutation.isPending && reprocessMutation.variables === article.id}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        <AnimatePresence>
                            {isFetchingNextPage && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-3 py-2 w-full overflow-hidden"
                                >
                                    {[1, 2].map(i => (
                                        <div key={`loading-${i}`} className="h-20 w-full bg-muted/50 rounded-xl animate-pulse" />
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div ref={inViewRef} className="h-4" />

                        {filteredArticles.length === 0 && !isLoading && (
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

            {/* Modals */}
            <ConfirmationModal
                isOpen={!!confirmDeleteItem}
                onClose={() => setConfirmDeleteItem(null)}
                onConfirm={() => {
                    if (confirmDeleteItem) {
                        deleteMutation.mutate(confirmDeleteItem.id);
                        setConfirmDeleteItem(null);
                    }
                }}
                title="Delete Article"
                description={
                    confirmDeleteItem?.isPublished || confirmDeleteItem?.isScheduled
                        ? "This article is currently live or scheduled. Deleting it will also UNPUBLISH it from all platforms. Are you sure?"
                        : "Are you sure you want to delete this article? This action cannot be undone."
                }
                confirmLabel="Delete"
                variant="danger"
                isLoading={deleteMutation.isPending}
            />

            <ConfirmationModal
                isOpen={!!confirmUnpublishItem}
                onClose={() => setConfirmUnpublishItem(null)}
                onConfirm={() => {
                    if (confirmUnpublishItem) {
                        updateMutation.mutate({ id: confirmUnpublishItem.id, status: 'DRAFT' });
                        unpublishMutation.mutate(confirmUnpublishItem.id);
                        setConfirmUnpublishItem(null);
                    }
                }}
                title="Unpublish Article"
                description="Unpublish this article? It will be reverted to a draft."
                confirmLabel="Unpublish"
                variant="warning"
                isLoading={updateMutation.isPending}
            />

            <ConfirmationModal
                isOpen={!!confirmReprocessItem}
                onClose={() => setConfirmReprocessItem(null)}
                onConfirm={() => {
                    if (confirmReprocessItem) {
                        reprocessMutation.mutate(confirmReprocessItem.id);
                        setConfirmReprocessItem(null);
                    }
                }}
                title="Reprocess Article"
                description="Do you want to re-generate this article? This will overwrite the current content with a fresh AI-generated version based on the original source."
                confirmLabel="Reprocess"
                variant="info"
                isLoading={reprocessMutation.isPending}
            />
        </div>
    );
};

const ArticleActions = ({
    article,
    onDelete,
    onUnpublish,
    onReprocess,
    isUnpublishing,
    isReprocessing
}: {
    article: any,
    onDelete: () => void,
    onUnpublish: (id: string) => void,
    onReprocess: () => void,
    isUnpublishing: boolean,
    isReprocessing: boolean
}) => {

    return (
        <div className="flex items-center gap-1">
            {article.publications?.some((pub: any) => pub.status === 'PUBLISHED') && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 z-10 relative"
                    title="Unpublish (Revert to Draft)"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onUnpublish(article.id);
                    }}
                >
                    {isUnpublishing ? <Loader2 size={16} className="animate-spin" /> : <Undo2 size={16} />}
                </Button>
            )}
            {(article.processingStatus === 'FAILED' || article.processingStatus === 'COMPLETED') && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 z-10 relative"
                    title="Reprocess Article"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onReprocess();
                    }}
                    disabled={isReprocessing || article.processingStatus === 'PROCESSING'}
                >
                    {isReprocessing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                </Button>
            )}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 relative"
                title="Delete"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                }}
            >
                <Trash2 size={16} />
            </Button>
        </div>
    );
};
