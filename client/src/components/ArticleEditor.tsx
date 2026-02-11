import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getArticle, updateArticle } from '../api';
import { Loader2, Link as LinkIcon, Bold, Italic, List, Heading2, Code, ArrowLeft, Save, UploadCloud, Calendar } from 'lucide-react';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import type { ArticleStatus } from '../types';
import { ScheduleModal } from './ScheduleModal';

export const ArticleEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const { data: article, isLoading } = useQuery({
        queryKey: ['article', id],
        queryFn: () => getArticle(id!),
        enabled: !!id,
    });

    useEffect(() => {
        if (article?.markdownContent) {
            setContent(article.markdownContent);
        }
    }, [article]);

    // ... inside component
    const updateMutation = useMutation({
        mutationFn: (data: { markdownContent?: string; status?: ArticleStatus; scheduledAt?: string }) => updateArticle(id!, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['article', id] });
            if (data.status === 'PUBLISHED') {
                toast.success('Article published successfully!');
            } else if (data.status === 'SCHEDULED') {
                toast.success('Article scheduled successfully!');
            } else if (data.status === 'DRAFT') {
                toast.success('Article unpublished (Draft).');
            } else {
                toast.success('Article saved successfully!');
            }
        },
        onError: () => {
            toast.error('Failed to save article.');
        }
    });

    const handleSave = () => {
        updateMutation.mutate({ markdownContent: content });
    };

    const handlePublish = () => {
        updateMutation.mutate({ markdownContent: content, status: 'PUBLISHED' });
    };

    const handleSchedule = (dateTime: Date) => {
        const isoString = dateTime.toISOString();
        updateMutation.mutate({ markdownContent: content, status: 'SCHEDULED', scheduledAt: isoString });
    };

    const insertText = (before: string, after: string = '') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);

        setContent(newText);

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + before.length, end + before.length);
        }, 0);
    };

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (!textareaRef.current || !previewRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const scrollRatio = scrollTop / (scrollHeight - clientHeight);
        const preview = previewRef.current;
        if (preview.scrollHeight > preview.clientHeight) {
            preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!article) return <div className="p-10 text-center text-muted-foreground">Article not found</div>;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full bg-background transition-all duration-500"
        >
            {/* Minimalist Floating Toolbar */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-muted text-muted-foreground">
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-md">{article.title}</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <span className={cn("w-1.5 h-1.5 rounded-full", article.status === 'PUBLISHED' ? "bg-emerald-500" : article.status === 'SCHEDULED' ? "bg-blue-500" : "bg-amber-500")}></span>
                                {article.status}
                            </p>
                            {article.status === 'SCHEDULED' && article.scheduledAt && (
                                <button
                                    onClick={() => setShowScheduleModal(true)}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
                                >
                                    <Calendar size={10} />
                                    {new Date(article.scheduledAt).toLocaleString()}
                                </button>
                            )}
                            {article.sourceUrl && (
                                <a
                                    href={article.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline truncate max-w-[300px]"
                                >
                                    <LinkIcon size={10} />
                                    {article.sourceUrl}
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {(article.status === 'PUBLISHED' || article.status === 'SCHEDULED') && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateMutation.mutate({ status: 'DRAFT', scheduledAt: '' })} // reverted to DRAFT or similar state
                                disabled={updateMutation.isPending}
                                className="text-amber-500 border-amber-500/20 hover:bg-amber-500/10 gap-2"
                            >
                                {updateMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Loader2 size={16} className="rotate-180" />}
                                {article.status === 'SCHEDULED' ? 'Cancel' : 'Unpublish'}
                            </Button>
                        </motion.div>
                    )}

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button variant="ghost" size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
                            <Save size={16} />
                            Save
                        </Button>
                    </motion.div>

                    {article.status !== 'PUBLISHED' && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowScheduleModal(true)}
                                disabled={updateMutation.isPending}
                                className="border-blue-500/20 text-blue-500 hover:bg-blue-500/10 gap-2"
                            >
                                <Calendar size={16} />
                                {article.status === 'SCHEDULED' ? 'Reschedule' : 'Schedule'}
                            </Button>
                        </motion.div>
                    )}

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                            size="sm"
                            onClick={handlePublish}
                            disabled={updateMutation.isPending}
                            className="bg-primary text-primary-foreground shadow-lg shadow-indigo-500/20 hover:bg-primary/90 gap-2"
                        >
                            {updateMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <UploadCloud size={16} />}
                            {article.status === 'PUBLISHED' ? 'Update' : 'Publish Now'}
                        </Button>
                    </motion.div>
                </div>

                <ScheduleModal
                    isOpen={showScheduleModal}
                    onClose={() => setShowScheduleModal(false)}
                    onSchedule={handleSchedule}
                    currentScheduledAt={article.scheduledAt}
                />
            </header>

            {/* Editor Workspace */}
            <div className="flex flex-1 overflow-hidden">
                {/* Editor Pane */}
                <div className="w-1/2 flex flex-col border-r border-border/40 relative group">
                    {/* Floating Formatting Toolbar */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full bg-foreground/5 backdrop-blur-md border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-30">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50" onClick={() => insertText('**', '**')}><Bold size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50" onClick={() => insertText('*', '*')}><Italic size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50" onClick={() => insertText('## ')}><Heading2 size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50" onClick={() => insertText('- ')}><List size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50" onClick={() => insertText('`', '`')}><Code size={14} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50" onClick={() => insertText('[', '](url)')}><LinkIcon size={14} /></Button>
                    </div>

                    <textarea
                        ref={textareaRef}
                        onScroll={handleScroll}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start writing your masterpiece..."
                        className="flex-1 w-full p-8 resize-none bg-transparent focus:outline-none font-mono text-sm leading-relaxed text-foreground/80 placeholder:text-muted-foreground/30 scroll-smooth selection:bg-indigo-500/20"
                    />
                </div>

                {/* Preview Pane */}
                <div
                    ref={previewRef}
                    className="w-1/2 overflow-auto bg-muted/20 scroll-smooth"
                >
                    <div className="max-w-2xl mx-auto py-12 px-8 
            prose prose-slate dark:prose-invert 
            text-foreground/80 dark:text-gray-300
            dark:prose-headings:text-gray-100">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code(props) {
                                    const { children, className, node, ref, ...rest } = props
                                    const match = /language-(\w+)/.exec(className || '')
                                    return match ? (
                                        <SyntaxHighlighter
                                            {...rest}
                                            PreTag="div"
                                            children={String(children).replace(/\n$/, '')}
                                            language={match[1]}
                                            style={vscDarkPlus}
                                            customStyle={{ background: 'rgba(0,0,0,0.2)', margin: 0, borderRadius: '0.5rem', padding: '1rem' }}
                                        />
                                    ) : (
                                        <code {...rest} className={className}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
