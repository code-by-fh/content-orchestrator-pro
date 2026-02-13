import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getArticle, updateArticle } from '../api';
import {
    Loader2,
    Link as LinkIcon,
    Bold,
    Italic,
    List,
    Heading2,
    Code,
    ArrowLeft,
    Save,
    UploadCloud,
    Calendar,
    Columns,
    Rows,
    Repeat,
    X
} from 'lucide-react';
import { Button } from './ui/Button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { Article } from '../types';
import { ScheduleModal } from './ScheduleModal';
import { Panel, Group, Separator } from 'react-resizable-panels';


export const ArticleEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [showInfoSidebar, setShowInfoSidebar] = useState(false);
    const [showTranscriptModal, setShowTranscriptModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Editable Metadata State
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [linkedinTeaser, setLinkedinTeaser] = useState('');
    const [xingSummary, setXingSummary] = useState('');

    // Panel Layout State
    const [isSwapped, setIsSwapped] = useState(false);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const panelGroupRef = useRef<any>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const { data: article, isLoading } = useQuery({
        queryKey: ['article', id],
        queryFn: () => getArticle(id!),
        enabled: !!id,
    });

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setOrientation('vertical');
            } else {
                setOrientation('horizontal');
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (article) {
            if (article.markdownContent) setContent(article.markdownContent);
            setSeoTitle(article.seoTitle || article.title || '');
            setSeoDescription(article.seoDescription || '');
            setLinkedinTeaser(article.linkedinTeaser || '');
            setXingSummary(article.xingSummary || '');
        }
    }, [article]);

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Article>) => updateArticle(id!, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['article', id] });
            if (data.status === 'PUBLISHED') {
                toast.success('Article published successfully!');
            } else if (data.status === 'SCHEDULED') {
                toast.success('Article scheduled successfully!');
            } else if (data.status === 'DRAFT') {
                toast.success('Article unpublished (Draft).');
            } else {
                toast.success('Changes saved successfully!');
            }
        },
        onError: () => {
            toast.error('Failed to save article.');
        }
    });

    const getMetadataPayload = () => ({
        seoTitle,
        seoDescription,
        linkedinTeaser,
        xingSummary
    });

    const handleSave = () => {
        updateMutation.mutate({
            markdownContent: content,
            ...getMetadataPayload()
        });
    };

    const handlePublish = () => {
        updateMutation.mutate({
            markdownContent: content,
            status: 'PUBLISHED',
            ...getMetadataPayload()
        });
    };

    const handleSchedule = (dateTime: Date) => {
        const isoString = dateTime.toISOString();
        updateMutation.mutate({
            markdownContent: content,
            status: 'SCHEDULED',
            scheduledAt: isoString,
            ...getMetadataPayload()
        });
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
            className="flex flex-col h-full bg-background transition-all duration-500 overflow-hidden"
        >
            {/* Responsive Toolbar */}
            <header className="h-16 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-40">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-muted text-muted-foreground shrink-0">
                        <ArrowLeft size={18} />
                    </Button>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm font-semibold text-foreground truncate max-w-[120px] md:max-w-md">{article.title}</h1>
                        <div className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                <span className={cn("w-1.5 h-1.5 rounded-full", article.status === 'PUBLISHED' ? "bg-emerald-500" : article.status === 'SCHEDULED' ? "bg-blue-500" : "bg-amber-500")}></span>
                                {article.status}
                            </p>
                            {article.status === 'SCHEDULED' && article.scheduledAt && (
                                <button
                                    onClick={() => setShowScheduleModal(true)}
                                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer whitespace-nowrap"
                                >
                                    <Calendar size={10} />
                                    <span className="hidden sm:inline">{new Date(article.scheduledAt).toLocaleString()}</span>
                                    <span className="sm:hidden">{new Date(article.scheduledAt).toLocaleDateString()}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pl-2">
                    {/* Layout Controls - Hidden on strict mobile, visible on desktop/tablet */}
                    <div className="hidden md:flex items-center gap-1 bg-muted/30 rounded-lg p-1 mr-2 border border-border/40">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setIsSwapped(!isSwapped)}
                            title="Swap Editor/Preview"
                        >
                            <Repeat size={14} className={cn("transition-transform duration-500", isSwapped && "rotate-180")} />
                        </Button>
                        <div className="w-px h-4 bg-border/40" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", orientation === 'horizontal' && "bg-background/80 shadow-sm")}
                            onClick={() => setOrientation('horizontal')}
                            title="Side-by-Side"
                        >
                            <Columns size={14} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-7 w-7", orientation === 'vertical' && "bg-background/80 shadow-sm")}
                            onClick={() => setOrientation('vertical')}
                            title="Stacked"
                        >
                            <Rows size={14} />
                        </Button>
                    </div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                            className={cn("gap-2 px-2 md:px-4", showInfoSidebar && "bg-indigo-500/10 text-indigo-500")}
                        >
                            <LinkIcon size={16} />
                            <span className="hidden md:inline">Info</span>
                        </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0">
                        <Button variant="ghost" size="sm" onClick={handleSave} disabled={updateMutation.isPending} className="gap-2 px-2 md:px-4">
                            <Save size={16} />
                            <span className="hidden md:inline">Save</span>
                        </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0">
                        <Button
                            size="sm"
                            onClick={handlePublish}
                            disabled={updateMutation.isPending}
                            className="bg-primary text-primary-foreground shadow-lg shadow-indigo-500/20 hover:bg-primary/90 gap-2 px-3 md:px-4"
                        >
                            {updateMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <UploadCloud size={16} />}
                            <span className="hidden md:inline">{article.status === 'PUBLISHED' ? 'Update' : 'Publish'}</span>
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
            <div className="flex flex-1 overflow-hidden relative">
                <Group orientation="horizontal" className="flex-1">
                    {/* Main Content Area */}
                    <Panel defaultSize={showInfoSidebar && !isMobile ? 67 : 100} minSize={30}>
                        <Group
                            groupRef={panelGroupRef}
                            orientation={orientation}
                            className="h-full"
                        >
                            {(() => {
                                const EditorPanel = (
                                    <Panel defaultSize={50} minSize={20} className="flex flex-col relative group">
                                        {/* Floating Formatting Toolbar - Repositioned for mobile */}
                                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-full bg-foreground/5 backdrop-blur-md border border-white/10 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-30 max-w-[90%] overflow-x-auto no-scrollbar">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('**', '**')}><Bold size={14} /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('*', '*')}><Italic size={14} /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('## ')}><Heading2 size={14} /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('- ')}><List size={14} /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('`', '`')}><Code size={14} /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('[', '](url)')}><LinkIcon size={14} /></Button>
                                        </div>

                                        <div className="flex-1 flex flex-col relative bg-background">
                                            <div className="absolute top-4 left-4 z-10 px-2 py-1 rounded bg-muted/50 text-[9px] uppercase tracking-widest font-bold text-muted-foreground pointer-events-none">
                                                Editor
                                            </div>
                                            <textarea
                                                ref={textareaRef}
                                                onScroll={handleScroll}
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                placeholder="Start writing your masterpiece..."
                                                className="flex-1 w-full p-4 md:p-8 resize-none bg-transparent focus:outline-none font-mono text-sm leading-relaxed text-foreground/80 placeholder:text-muted-foreground/30 scroll-smooth selection:bg-indigo-500/20"
                                            />
                                        </div>
                                    </Panel>
                                );

                                const PreviewPanel = (
                                    <Panel defaultSize={50} minSize={20} className="overflow-hidden bg-muted/20 relative border-l md:border-l-0 md:border-t border-border/40">
                                        <div className="absolute top-4 right-4 z-10 px-2 py-1 rounded bg-muted/50 text-[9px] uppercase tracking-widest font-bold text-muted-foreground pointer-events-none">
                                            Preview
                                        </div>
                                        <div
                                            ref={previewRef}
                                            className="h-full overflow-auto scroll-smooth"
                                        >
                                            <div className="max-w-2xl mx-auto py-8 md:py-12 px-4 md:px-8
                                                prose prose-slate dark:prose-invert
                                                text-foreground/80 dark:text-gray-300
                                                dark:prose-headings:text-gray-100
                                                prose-sm md:prose-base">
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
                                    </Panel>
                                );

                                const ResizeHandle = (
                                    <Separator className={cn(
                                        "group relative flex items-center justify-center bg-border/40 hover:bg-indigo-500/40 transition-colors z-20",
                                        orientation === 'horizontal' ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize"
                                    )}>
                                        <div className={cn(
                                            "z-50 flex items-center justify-center p-1 rounded-full bg-background border border-border transition-all duration-300 group-hover:scale-110 group-hover:border-indigo-500/50 group-active:scale-95 group-active:bg-indigo-500 group-active:text-white shadow-xl",
                                            orientation === 'horizontal' ? "h-6 w-1 -mx-0.5" : "w-6 h-1 -my-0.5"
                                        )} />
                                    </Separator>
                                );

                                return isSwapped ? (
                                    <>
                                        {PreviewPanel}
                                        {ResizeHandle}
                                        {EditorPanel}
                                    </>
                                ) : (
                                    <>
                                        {EditorPanel}
                                        {ResizeHandle}
                                        {PreviewPanel}
                                    </>
                                );
                            })()}
                        </Group>
                    </Panel>

                    {/* Info Sidebar - Full Screen on Mobile */}
                    {showInfoSidebar && (
                        <>
                            {!isMobile && (
                                <Separator className="w-1.5 cursor-col-resize group relative flex items-center justify-center bg-border/40 hover:bg-indigo-500/40 transition-colors">
                                    <div className="z-50 flex items-center justify-center p-1 rounded-full bg-background border border-border transition-all duration-300 group-hover:scale-110 group-hover:border-indigo-500/50 group-active:scale-95 group-active:bg-indigo-500 group-active:text-white shadow-xl h-6 w-1 -mx-0.5" />
                                </Separator>
                            )}
                            <div className={cn(
                                isMobile ? "fixed inset-x-0 bottom-0 top-16 z-[110] bg-background flex flex-col border-t border-border/40 shadow-2xl" : "block h-full"
                            )}>
                                {isMobile ? (
                                    <motion.div
                                        initial={{ x: '100%' }}
                                        animate={{ x: 0 }}
                                        exit={{ x: '100%' }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                        className="h-full flex flex-col bg-background"
                                    >
                                        <InfoPanelContent
                                            seoTitle={seoTitle} setSeoTitle={setSeoTitle}
                                            seoDescription={seoDescription} setSeoDescription={setSeoDescription}
                                            linkedinTeaser={linkedinTeaser} setLinkedinTeaser={setLinkedinTeaser}
                                            xingSummary={xingSummary} setXingSummary={setXingSummary}
                                            onClose={() => setShowInfoSidebar(false)}
                                            onShowTranscript={() => setShowTranscriptModal(true)}
                                            onSave={handleSave}
                                            isPending={updateMutation.isPending}
                                        />
                                    </motion.div>
                                ) : (
                                    <Panel defaultSize={33} minSize={15} className="border-l border-border/40 bg-card/50 backdrop-blur-xl flex flex-col overflow-hidden h-full">
                                        <InfoPanelContent
                                            seoTitle={seoTitle} setSeoTitle={setSeoTitle}
                                            seoDescription={seoDescription} setSeoDescription={setSeoDescription}
                                            linkedinTeaser={linkedinTeaser} setLinkedinTeaser={setLinkedinTeaser}
                                            xingSummary={xingSummary} setXingSummary={setXingSummary}
                                            onClose={() => setShowInfoSidebar(false)}
                                            onShowTranscript={() => setShowTranscriptModal(true)}
                                            onSave={handleSave}
                                            isPending={updateMutation.isPending}
                                        />
                                    </Panel>
                                )}
                            </div>
                        </>
                    )}
                </Group>
            </div>

            {/* Transcript Modal */}
            <AnimatePresence>
                {showTranscriptModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-24">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowTranscriptModal(false)}
                            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl h-full max-h-[80vh] bg-card border border-border/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="p-6 border-b border-border/40 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                        <Code size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold">Original Transcript</h2>
                                        <p className="text-xs text-muted-foreground">The raw content extracted from the source.</p>
                                    </div>
                                </div>
                                <Button variant="secondary" size="sm" className="h-9 px-4 gap-2 shadow-sm border border-border/50" onClick={() => setShowTranscriptModal(false)}>
                                    <span className="text-sm font-medium mr-1">Close</span>
                                    <X size={16} />
                                </Button>
                            </div>
                            <div className="flex-1 overflow-auto p-8 font-mono text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap selection:bg-indigo-500/20">
                                {article?.rawTranscript}
                            </div>
                            <div className="p-6 border-t border-border/40 bg-muted/30 flex justify-end">
                                <Button onClick={() => setShowTranscriptModal(false)}>Close View</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Extracted InfoPanelContent to reuse in mobile/desktop views
const InfoPanelContent = ({
    seoTitle, setSeoTitle,
    seoDescription, setSeoDescription,
    linkedinTeaser, setLinkedinTeaser,
    xingSummary, setXingSummary,
    onClose, onShowTranscript, onSave, isPending
}: any) => {
    return (
        <>
            <div className="p-4 md:p-6 border-b border-border/40 flex items-center justify-between bg-background/95 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                    <LinkIcon size={16} className="text-indigo-500" />
                    Additional Info
                </h3>
                <Button variant="secondary" size="sm" className="h-9 px-4 gap-2 shadow-sm border border-border/50" onClick={onClose}>
                    <span className="text-sm font-medium mr-1">Close</span>
                    <X size={16} />
                </Button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-8">
                {/* SEO Section */}
                <section className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-indigo-500 rounded-full" />
                        SEO Metadata
                    </h4>
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground ml-1">SEO Title</label>
                            <input
                                type="text"
                                value={seoTitle}
                                onChange={(e) => setSeoTitle(e.target.value)}
                                className="w-full text-sm bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 text-foreground transition-all shadow-sm"
                                placeholder="Enter SEO title..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground ml-1">SEO Description</label>
                            <textarea
                                value={seoDescription}
                                onChange={(e) => setSeoDescription(e.target.value)}
                                rows={4}
                                className="w-full text-sm bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 text-foreground transition-all resize-none shadow-sm"
                                placeholder="Enter meta description..."
                            />
                        </div>
                    </div>
                </section>

                {/* Social Media Section */}
                <section className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full" />
                        Social Teasers
                    </h4>
                    <div className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground ml-1">LinkedIn Teaser</label>
                            <textarea
                                value={linkedinTeaser}
                                onChange={(e) => setLinkedinTeaser(e.target.value)}
                                rows={5}
                                className="w-full text-sm bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-foreground transition-all resize-none shadow-sm"
                                placeholder="LinkedIn teaser content..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground ml-1">Xing Summary</label>
                            <textarea
                                value={xingSummary}
                                onChange={(e) => setXingSummary(e.target.value)}
                                rows={5}
                                className="w-full text-sm bg-background/50 border border-border/50 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 text-foreground transition-all resize-none shadow-sm"
                                placeholder="Xing summary content..."
                            />
                        </div>
                    </div>
                </section>

                {/* Action Buttons for Sidebar */}
                <div className="pt-6 space-y-3 pb-8">
                    <Button
                        className="w-full h-10 justify-start gap-3 bg-muted/50 hover:bg-muted text-muted-foreground border border-border/50"
                        variant="ghost"
                        onClick={onShowTranscript}
                    >
                        <Code size={16} />
                        View Original Transcript
                    </Button>
                    <Button
                        className="w-full h-10 justify-start gap-3 shadow-md"
                        onClick={onSave}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save All Changes
                    </Button>
                </div>
            </div>
        </>
    );
};
