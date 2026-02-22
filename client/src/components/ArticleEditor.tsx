import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getArticle, updateArticle, publishToPlatform, unpublishFromPlatform, unpublishAllFromArticle, uploadImage, getShareUrl } from '../api';
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
    X,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
    Send,
    Zap,
    ZapOff,
    MousePointer2,
    Linkedin,
    Share2,
    Globe,
    HelpCircle,
    AlignCenter,
    AlignLeft,
    AlignRight
} from 'lucide-react';

import { Button } from './ui/Button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import type { Article } from '../types';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { Tooltip } from './ui/Tooltip';



export const ArticleEditor: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [content, setContent] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
        const saved = localStorage.getItem('autoSaveEnabled');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

    const [showInfoSidebar, setShowInfoSidebar] = useState(false);
    const [showTranscriptModal, setShowTranscriptModal] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Editable Metadata State
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [linkedinTeaser, setLinkedinTeaser] = useState('');
    const [xingSummary, setXingSummary] = useState('');
    const [ogImageUrl, setOgImageUrl] = useState('');
    const [platformTokens, setPlatformTokens] = useState<Record<string, string>>({});
    const [showPublishModal, setShowPublishModal] = useState(false);


    // Panel Layout State
    const [isSwapped, setIsSwapped] = useState(false);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
    const panelGroupRef = useRef<any>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef<boolean>(false);

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
        localStorage.setItem('autoSaveEnabled', JSON.stringify(autoSaveEnabled));
    }, [autoSaveEnabled]);

    useEffect(() => {
        if (article) {
            if (article.markdownContent) setContent(article.markdownContent);
            setSeoTitle(article.seoTitle || article.title || '');
            setSeoDescription(article.seoDescription || '');
            setLinkedinTeaser(article.linkedinTeaser || '');
            setXingSummary(article.xingSummary || '');
            setOgImageUrl(article.ogImageUrl || '');
        }
    }, [article]);

    const updateMutation = useMutation({
        mutationFn: (data: Partial<Article> & { status?: string }) => updateArticle(id!, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['article', id] });
            setSaveStatus('saved');
            if (variables.status === 'PUBLISHED') {
                toast.success('Article published successfully!');
            } else if (variables.status === 'SCHEDULED') {
                toast.success('Article scheduled successfully!');
            } else if (variables.status === 'DRAFT') {
                toast.success('Article unpublished (Draft).');
            } else {
                // Only show toast if it's NOT an auto-save
                if (!(variables as any).isAutoSave) {
                    toast.success('Changes saved successfully!');
                }
            }
            // Reset to idle after 3 seconds
            setTimeout(() => setSaveStatus('idle'), 3000);
        },
        onError: () => {
            setSaveStatus('error');
            toast.error('Failed to save article.');
        }
    });

    const publishPlatformMutation = useMutation({
        mutationFn: ({ platform, token, language }: { platform: string, token?: string, language: string }) =>
            publishToPlatform(id!, platform, token, language),
        onSuccess: (_, variables) => {

            queryClient.invalidateQueries({ queryKey: ['article', id] });
            toast.success(`Published to ${variables.platform}!`);
        },
        onError: (error: any) => {
            toast.error(`Failed to publish: ${error.response?.data?.message || error.message}`);
        }
    });

    const handlePlatformPublish = (platform: string, language: string = 'DE') => {
        publishPlatformMutation.mutate({
            platform,
            token: platformTokens[platform],
            language
        });
    };

    const unpublishPlatformMutation = useMutation({
        mutationFn: ({ platform, language }: { platform: string, language: string }) => unpublishFromPlatform(id!, platform, language),
        onSuccess: (_, variables) => {

            queryClient.invalidateQueries({ queryKey: ['article', id] });
            toast.success(`Unpublished from ${variables.platform}!`);
        },
        onError: (error: any) => {
            toast.error(`Failed to unpublish: ${error.response?.data?.message || error.message}`);
        }
    });

    const handlePlatformUnpublish = (platform: string, language: string = 'DE') => {
        unpublishPlatformMutation.mutate({ platform, language });
    };


    const handlePublishAll = () => {
        article?.availablePlatforms?.forEach(p => {
            if (p.couldAutoPublish) {
                handlePlatformPublish(p.platform);
            }
        });
    };


    const getMetadataPayload = () => ({
        seoTitle,
        seoDescription,
        linkedinTeaser,
        xingSummary,
        ogImageUrl
    });

    const handleSave = (isAutoSave = false) => {
        setSaveStatus('saving');
        updateMutation.mutate({
            markdownContent: content,
            ...getMetadataPayload(),
            ...(isAutoSave ? { isAutoSave: true } : {}) as any
        });
    };

    const handlePublish = () => {
        setShowPublishModal(true);
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

    const unpublishAllMutation = useMutation({
        mutationFn: () => unpublishAllFromArticle(id!),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['article', id] });
            toast.success(`Unpublished from all platforms!`);
        },
        onError: (error: any) => {
            toast.error(`Failed to unpublish all: ${error.response?.data?.message || error.message}`);
        }
    });

    const handleUnpublishAll = () => {
        updateMutation.mutate({
            status: 'DRAFT',
            scheduledAt: null as any
        });
        unpublishAllMutation.mutate();
    };

    const handleUnpublish = () => {
        handleUnpublishAll();
        setShowUnpublishConfirm(false);
    };

    // Auto-save logic
    useEffect(() => {
        if (!article || !autoSaveEnabled) return;

        const timer = setTimeout(() => {
            // Check if anything actually changed compared to the last fetched article
            const hasChanged =
                content !== (article.markdownContent || '') ||
                seoTitle !== (article.seoTitle || article.title || '') ||
                seoDescription !== (article.seoDescription || '') ||
                linkedinTeaser !== (article.linkedinTeaser || '') ||
                xingSummary !== (article.xingSummary || '');

            if (hasChanged && saveStatus !== 'saving') {
                handleSave(true);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [content, seoTitle, seoDescription, linkedinTeaser, xingSummary]);

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();

                    // Insert placeholder
                    const placeholder = `![Uploading image...]()`;
                    const textarea = textareaRef.current;
                    if (!textarea) return;

                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const beforeText = content.substring(0, start);
                    const afterText = content.substring(end);

                    setContent(beforeText + placeholder + afterText);

                    try {
                        const { imageUrl } = await uploadImage(file);
                        const finalMarkdown = `![Image](${imageUrl}#width60-center)`;

                        // Replace placeholder with final markdown
                        setContent(prev => prev.replace(placeholder, finalMarkdown));
                    } catch (error) {
                        toast.error('Failed to upload image');
                        // Remove placeholder on failure
                        setContent(prev => prev.replace(placeholder, ''));
                    }
                }
            }
        }
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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    insertText('**', '**');
                    break;
                case 'i':
                    e.preventDefault();
                    insertText('*', '*');
                    break;
                case 'k':
                    e.preventDefault();
                    insertText('[', '](url)');
                    break;
                case 's':
                    e.preventDefault();
                    handleSave(false);
                    break;
                case '1':
                    e.preventDefault();
                    insertText('# ');
                    break;
                case '2':
                    e.preventDefault();
                    insertText('## ');
                    break;
                case '3':
                    e.preventDefault();
                    insertText('### ');
                    break;
                case 'l':
                    e.preventDefault();
                    insertText('- ');
                    break;
            }
        }
    };

    const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        if (isScrollingRef.current) return;
        if (!textareaRef.current || !previewRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 0) return;

        isScrollingRef.current = true;
        const scrollRatio = scrollTop / maxScroll;

        const preview = previewRef.current;
        preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight);

        // Reset the flag after a short delay to avoid feedback loops
        setTimeout(() => {
            isScrollingRef.current = false;
        }, 10);
    };

    const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isScrollingRef.current) return;
        if (!textareaRef.current || !previewRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 0) return;

        isScrollingRef.current = true;
        const scrollRatio = scrollTop / maxScroll;

        const textarea = textareaRef.current;
        textarea.scrollTop = scrollRatio * (textarea.scrollHeight - textarea.clientHeight);

        setTimeout(() => {
            isScrollingRef.current = false;
        }, 10);
    };

    const applyTextAlign = (align: 'left' | 'center' | 'right') => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);

        if (selectedText) {
            const before = `<div align="${align}">\n`;
            const after = `\n</div>`;
            const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
            setContent(newText);

            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
            }, 0);
        } else {
            insertText(`<div align="${align}">\n`, `\n</div>`);
        }
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    if (!article) return <div className="p-10 text-center text-muted-foreground">Article not found</div>;

    if (article.processingStatus === 'PROCESSING' || article.processingStatus === 'PENDING') {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-background space-y-6 p-6 text-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                    <Loader2 className="animate-spin text-primary w-16 h-16 relative" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold tracking-tight">Generating Magic...</h2>
                    <p className="text-muted-foreground">
                        We're currently extracting the content and generating your SEO-optimized article. This usually takes less than a minute.
                    </p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
                    <Button variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ["article", id] })}>Refresh Status</Button>
                </div>
            </div>
        );
    }

    if (article.processingStatus === 'FAILED') {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-background space-y-6 p-6 text-center">
                <AlertCircle className="text-destructive w-16 h-16" />
                <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-bold tracking-tight text-destructive">Processing Failed</h2>
                    <p className="text-muted-foreground">
                        Something went wrong during content generation. Please try again or check the source URL.
                    </p>
                </div>
                <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col h-full bg-background transition-all duration-500 overflow-hidden"
        >
            {/* Responsive Toolbar */}
            <header className="h-16 md:h-16 flex items-center justify-between px-4 md:px-6 border-b border-border/40 backdrop-blur-xl bg-background/80 sticky top-0 z-40">
                <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
                    <Tooltip content="Go back" side="bottom">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-muted text-muted-foreground shrink-0">
                            <ArrowLeft size={18} />
                        </Button>
                    </Tooltip>

                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm font-semibold text-foreground truncate max-w-[120px] md:max-w-md">{article.title}</h1>
                        <div className="flex items-center gap-2">
                            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">
                                {article.publications?.some((p: any) => p.status === 'PUBLISHED') ? 'PUBLISHED' : article.scheduledAt ? 'SCHEDULED' : 'DRAFT'}
                            </div>

                            {/* Platform Icons for Published Content */}
                            {article.publications && article.publications.some(p => p.status === 'PUBLISHED') && (
                                <>
                                    <div className="w-px h-3 bg-border/40 shrink-0" />
                                    <div className="flex items-center gap-1">
                                        {article.publications
                                            .filter(p => p.status === 'PUBLISHED')
                                            .map((pub) => {
                                                const platform = pub.platform.toUpperCase();
                                                return (
                                                    <Tooltip key={pub.id} content={`Published on ${platform}`} side="bottom">
                                                        <div
                                                            className={cn(
                                                                "p-1 rounded bg-muted/30 text-muted-foreground hover:text-foreground transition-colors shrink-0",
                                                                platform === 'LINKEDIN' && "hover:text-[#0077b5]",
                                                                platform === 'XING' && "hover:text-[#026466]",
                                                                platform === 'RSS' && "hover:text-orange-500",
                                                                platform === 'WEBHOOK' && "hover:text-blue-500"
                                                            )}
                                                        >
                                                            {platform === 'LINKEDIN' ? <Linkedin size={10} /> :
                                                                platform === 'XING' ? <Share2 size={10} /> :
                                                                    platform === 'RSS' ? <Globe size={10} /> :
                                                                        platform === 'WEBHOOK' ? <Globe size={10} /> :
                                                                            <UploadCloud size={10} />}
                                                        </div>
                                                    </Tooltip>

                                                );
                                            })}
                                    </div>
                                </>
                            )}
                            {article.scheduledAt && !article.publications?.some((p: any) => p.status === 'PUBLISHED') && (
                                <>
                                    <div className="w-px h-3 bg-border/40 shrink-0" />
                                    <button
                                        onClick={() => setShowPublishModal(true)}
                                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer font-medium shrink-0"
                                    >
                                        <Calendar size={10} />
                                        <span>{new Date(article.scheduledAt).toLocaleString()}</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pl-2">
                    {/* Layout Controls - Hidden on strict mobile, visible on desktop/tablet */}
                    <div className="hidden md:flex items-center gap-1 bg-muted/30 rounded-lg p-1 mr-2 border border-border/40">
                        <Tooltip content="Swap Editor/Preview">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setIsSwapped(!isSwapped)}
                            >
                                <Repeat size={14} className={cn("transition-transform duration-500", isSwapped && "rotate-180")} />
                            </Button>
                        </Tooltip>

                        <div className="w-px h-4 bg-border/40" />
                        <Tooltip content="Side-by-Side">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7", orientation === 'horizontal' && "bg-background/80 shadow-sm")}
                                onClick={() => setOrientation('horizontal')}
                            >
                                <Columns size={14} />
                            </Button>
                        </Tooltip>
                        <Tooltip content="Stacked">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("h-7 w-7", orientation === 'vertical' && "bg-background/80 shadow-sm")}
                                onClick={() => setOrientation('vertical')}
                            >
                                <Rows size={14} />
                            </Button>
                        </Tooltip>

                    </div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0">
                        <Tooltip content="Toggle Info Sidebar" side="bottom">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowInfoSidebar(!showInfoSidebar)}
                                className={cn("gap-2 px-2 md:px-4", showInfoSidebar && "bg-indigo-500/10 text-indigo-500")}
                            >
                                <LinkIcon size={16} />
                                <span className="hidden md:inline">Info</span>
                            </Button>
                        </Tooltip>
                    </motion.div>


                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1 border border-border/40 overflow-hidden">
                            <div className="relative flex items-center h-7 min-w-[70px] md:min-w-[90px] justify-center px-2">
                                <AnimatePresence mode="wait">
                                    {saveStatus === 'saving' && (
                                        <motion.div
                                            key="saving"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-tight absolute"
                                        >
                                            <Loader2 size={10} className="animate-spin" />
                                            <span>Saving</span>
                                        </motion.div>
                                    )}
                                    {saveStatus === 'saved' && (
                                        <motion.div
                                            key="saved"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-tight absolute"
                                        >
                                            <CheckCircle2 size={10} />
                                            <span>Saved</span>
                                        </motion.div>
                                    )}
                                    {saveStatus === 'error' && (
                                        <motion.div
                                            key="error"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex items-center gap-1.5 text-[10px] font-bold text-destructive uppercase tracking-tight absolute"
                                        >
                                            <AlertCircle size={10} />
                                            <span>Error</span>
                                        </motion.div>
                                    )}
                                    {saveStatus === 'idle' && (
                                        <motion.div
                                            key="save-btn"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="shrink-0 absolute"
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSave(false)}
                                                disabled={updateMutation.isPending}
                                                className="gap-2 px-1 md:px-2 h-6 hover:bg-transparent"
                                            >
                                                <Save size={14} />
                                                <span className="text-xs font-semibold">Save</span>
                                            </Button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="w-px h-4 bg-border/40 shrink-0" />

                            <Tooltip content={autoSaveEnabled ? "Disable Auto-Save" : "Enable Auto-Save"}>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 shrink-0 transition-colors rounded-md",
                                        autoSaveEnabled ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground"
                                    )}
                                    onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                                >
                                    {autoSaveEnabled ? <Zap size={14} fill="currentColor" /> : <ZapOff size={14} />}
                                </Button>
                            </Tooltip>

                        </div>
                    </div>



                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="shrink-0">
                        <Button
                            size="sm"
                            onClick={handlePublish}
                            disabled={updateMutation.isPending}
                            className="bg-primary text-primary-foreground shadow-lg shadow-indigo-500/20 hover:bg-primary/90 gap-2 px-3 md:px-4"
                        >
                            {updateMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <UploadCloud size={16} />}
                            <span className="hidden md:inline">{article.publications?.some((p: any) => p.status === 'PUBLISHED') ? 'Update' : 'Publish'}</span>
                        </Button>
                    </motion.div>
                </div>


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
                                            <Tooltip content="Bold (Ctrl+B)"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('**', '**')}><Bold size={14} /></Button></Tooltip>
                                            <Tooltip content="Italic (Ctrl+I)"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('*', '*')}><Italic size={14} /></Button></Tooltip>
                                            <Tooltip content="Heading 2"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('## ')}><Heading2 size={14} /></Button></Tooltip>
                                            <Tooltip content="Bullet List"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('- ')}><List size={14} /></Button></Tooltip>
                                            <Tooltip content="Code"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('`', '`')}><Code size={14} /></Button></Tooltip>
                                            <Tooltip content="Link (Ctrl+K)"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => insertText('[', '](url)')}><LinkIcon size={14} /></Button></Tooltip>
                                            <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
                                            <Tooltip content="Align Left"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => applyTextAlign('left')}><AlignLeft size={14} /></Button></Tooltip>
                                            <Tooltip content="Align Center"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => applyTextAlign('center')}><AlignCenter size={14} /></Button></Tooltip>
                                            <Tooltip content="Align Right"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/50 shrink-0" onClick={() => applyTextAlign('right')}><AlignRight size={14} /></Button></Tooltip>
                                        </div>


                                        <div className="flex-1 flex flex-col relative bg-background">
                                            <div className="absolute top-4 left-4 z-10 px-2 py-1 rounded bg-muted/50 text-[9px] uppercase tracking-widest font-bold text-muted-foreground pointer-events-none">
                                                Editor
                                            </div>
                                            <textarea
                                                ref={textareaRef}
                                                onScroll={handleEditorScroll}
                                                onPaste={handlePaste}
                                                onKeyDown={handleKeyDown}
                                                value={content}
                                                onChange={(e) => setContent(e.target.value)}
                                                placeholder="Start writing your masterpiece..."
                                                className="flex-1 w-full p-4 pb-[7vh] pt-[5vh] resize-none bg-transparent focus:outline-none font-mono text-sm leading-relaxed text-foreground/80 placeholder:text-muted-foreground/30 selection:bg-indigo-500/20 custom-scrollbar"



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
                                            onScroll={handlePreviewScroll}
                                            className="h-full overflow-y-scroll custom-scrollbar"
                                        >
                                            <div className="max-w-5xl mx-auto pb-[7vh] pt-[5vh] px-4 md:px-8
                                                prose prose-slate dark:prose-invert
                                                text-foreground/80 dark:text-gray-100
                                                dark:prose-headings:text-white
                                                prose-sm md:prose-base">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    rehypePlugins={[rehypeRaw]}
                                                    components={{
                                                        h1: ({ node, ...props }) => <h1 {...props} className="text-foreground dark:text-white font-bold border-b border-border/50 pb-2 mb-6" />,
                                                        h2: ({ node, ...props }) => <h2 {...props} className="text-foreground dark:text-white font-bold mt-8 mb-4" />,
                                                        h3: ({ node, ...props }) => <h3 {...props} className="text-foreground dark:text-white font-semibold mt-6 mb-3" />,
                                                        strong: ({ node, ...props }) => <strong {...props} className="text-foreground dark:text-white font-bold" />,
                                                        img: ({ node, ...props }) => {
                                                            if (!props.src) return <span className="inline-flex items-center gap-2 text-muted-foreground italic text-sm animate-pulse"><Loader2 size={14} className="animate-spin" /> Uploading image...</span>;

                                                            // Parse width and alignment from fragment (e.g. #width50-center)
                                                            const fragment = props.src.split('#')[1] || '';
                                                            const widthMatch = fragment.match(/width(\d+)/);
                                                            const alignMatch = fragment.match(/(left|center|right)/);

                                                            const width = widthMatch ? `${widthMatch[1]}%` : '100%';
                                                            const align = alignMatch ? alignMatch[1] : 'center';

                                                            const alignmentClasses = {
                                                                left: 'mr-auto ml-0',
                                                                center: 'mx-auto',
                                                                right: 'ml-auto mr-0'
                                                            }[align];

                                                            return (
                                                                <div className={cn("flex my-8", alignmentClasses)} style={{ width }}>
                                                                    <img
                                                                        {...props}
                                                                        className="rounded-xl border border-border/40 shadow-lg w-full h-auto"
                                                                    />
                                                                </div>
                                                            );
                                                        },
                                                        li: ({ node, ...props }) => <li {...props} className="block mb-2" />,
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

                    {/* Info Sidebar - Desktop (Direct Panel Child for Resizability) */}
                    {showInfoSidebar && !isMobile && (
                        <>
                            <Separator className="w-1.5 cursor-col-resize group relative flex items-center justify-center bg-border/40 hover:bg-indigo-500/40 transition-colors">
                                <div className="z-50 flex items-center justify-center p-1 rounded-full bg-background border border-border transition-all duration-300 group-hover:scale-110 group-hover:border-indigo-500/50 group-active:scale-95 group-active:bg-indigo-500 group-active:text-white shadow-xl h-6 w-1 -mx-0.5" />
                            </Separator>
                            <Panel defaultSize={33} minSize={15} className="border-l border-border/40 bg-card/50 backdrop-blur-xl flex flex-col overflow-hidden h-full">
                                <InfoPanelContent
                                    seoTitle={seoTitle} setSeoTitle={setSeoTitle}
                                    seoDescription={seoDescription} setSeoDescription={setSeoDescription}
                                    linkedinTeaser={linkedinTeaser} setLinkedinTeaser={setLinkedinTeaser}
                                    xingSummary={xingSummary} setXingSummary={setXingSummary}
                                    ogImageUrl={ogImageUrl} setOgImageUrl={setOgImageUrl}
                                    onClose={() => setShowInfoSidebar(false)}
                                    onShowTranscript={() => setShowTranscriptModal(true)}
                                />
                            </Panel>
                        </>
                    )}

                    {/* Info Sidebar - Mobile (Fixed Overlay) */}
                    {showInfoSidebar && isMobile && (
                        <div className="fixed inset-x-0 bottom-0 top-16 z-[110] bg-background flex flex-col border-t border-border/40 shadow-2xl">
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
                                    ogImageUrl={ogImageUrl} setOgImageUrl={setOgImageUrl}
                                    onClose={() => setShowInfoSidebar(false)}
                                    onShowTranscript={() => setShowTranscriptModal(true)}
                                />
                            </motion.div>
                        </div>
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

            <ConfirmationModal
                isOpen={showUnpublishConfirm}
                onClose={() => setShowUnpublishConfirm(false)}
                onConfirm={handleUnpublish}
                title="Unpublish Article"
                description="Are you sure you want to unpublish this article? It will be moved back to drafts and any scheduled publication will be cancelled."
                confirmLabel="Unpublish"
                variant="warning"
                isLoading={updateMutation.isPending}
            />

            <PublishOptionsModal
                isOpen={showPublishModal}
                onClose={() => setShowPublishModal(false)}
                publications={article?.publications}
                availablePlatforms={article?.availablePlatforms}
                onPublishPlatform={handlePlatformPublish}
                onUnpublishPlatform={handlePlatformUnpublish}
                onUnpublishAll={handleUnpublishAll}
                onPublishAll={handlePublishAll}
                onSchedule={handleSchedule}
                platformTokens={platformTokens}
                setPlatformTokens={setPlatformTokens}
                isPublishing={publishPlatformMutation.isPending}
                scheduledAt={article?.scheduledAt}
                xingSummary={xingSummary}
                article={article}
                onUnpublish={() => setShowUnpublishConfirm(true)}
                status={article?.publications?.some((p: any) => p.status === 'PUBLISHED') ? 'PUBLISHED' : article?.scheduledAt ? 'SCHEDULED' : 'DRAFT'}
            />



        </motion.div>
    );
};

// Extracted InfoPanelContent to reuse in mobile/desktop views
const InfoPanelContent = ({
    seoTitle, setSeoTitle,
    seoDescription, setSeoDescription,
    linkedinTeaser, setLinkedinTeaser,
    xingSummary, setXingSummary,
    ogImageUrl, setOgImageUrl,
    onClose, onShowTranscript
}: any) => {


    const [isDragging, setIsDragging] = useState(false);

    const handleFileUpload = async (file: File) => {
        try {
            const { imageUrl } = await uploadImage(file);
            setOgImageUrl(imageUrl);
            toast.success('Image uploaded successfully');
        } catch (error) {
            toast.error('Failed to upload image');
        }
    };

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

            <div className="flex-1 overflow-y-scroll p-6 space-y-8 scroll-smooth min-h-0 custom-scrollbar">
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
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-muted-foreground ml-1">OG Image</label>
                            <div className="flex flex-col gap-2">
                                {ogImageUrl && (
                                    <div className="relative group rounded-lg overflow-hidden border border-border/50 bg-background/50 w-full aspect-video flex items-center justify-center">
                                        <img src={ogImageUrl.startsWith('http') || ogImageUrl.startsWith('/uploads') ? ogImageUrl : import.meta.env.VITE_API_URL?.replace('/api', '') + ogImageUrl} alt="OG Preview" className="max-w-full max-h-full object-contain" />
                                        <button
                                            onClick={() => setOgImageUrl('')}
                                            className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-red-500 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-all text-muted-foreground shadow-sm backdrop-blur-sm"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "relative group flex items-center justify-center gap-2 bg-background border border-border/60 hover:bg-muted/50 text-foreground transition-all shadow-sm rounded-lg border-dashed border-2 p-4 min-h-[100px]",
                                        isDragging && "border-emerald-500 bg-emerald-500/5 scale-[1.02]",
                                        !ogImageUrl && "min-h-[140px]"
                                    )}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setIsDragging(true);
                                    }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        setIsDragging(false);
                                        const file = e.dataTransfer.files?.[0];
                                        if (file && file.type.startsWith('image/')) {
                                            await handleFileUpload(file);
                                        }
                                    }}
                                >
                                    <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center gap-2">
                                        <UploadCloud
                                            size={24}
                                            className={cn(
                                                "text-muted-foreground transition-colors",
                                                isDragging && "text-emerald-500"
                                            )}
                                        />
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-xs font-semibold">
                                                {ogImageUrl ? 'Change Image' : 'Upload Image'}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">
                                                Drag & drop or click to select
                                            </span>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    await handleFileUpload(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Shortcut Help Section */}
                <section className="space-y-4 pt-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <HelpCircle size={16} className="text-amber-500" />
                        Keyboard Shortcuts
                    </h4>
                    <div className="grid grid-cols-1 gap-2 bg-muted/20 rounded-xl p-4 border border-border/40">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Bold</span>
                            <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Ctrl + B</kbd>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Italic</span>
                            <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Ctrl + I</kbd>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Insert Link</span>
                            <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Ctrl + K</kbd>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Save Article</span>
                            <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Ctrl + S</kbd>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Heading 1/2/3</span>
                            <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Ctrl + 1/2/3</kbd>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Bullet List</span>
                            <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-mono shadow-sm">Ctrl + L</kbd>
                        </div>
                        <div className="pt-2 border-t border-border/40 mt-1">
                            <p className="text-[10px] text-muted-foreground italic">
                                Images: use <code className="text-indigo-400">#width50-center</code> at the end of the URL to resize and align.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Action Buttons for Sidebar */}
                <div className="pt-2 space-y-3 pb-8">
                    <Button
                        className="w-full h-10 justify-start gap-3 bg-muted/50 hover:bg-muted text-muted-foreground border border-border/50"
                        variant="ghost"
                        onClick={onShowTranscript}
                    >
                        <Code size={16} />
                        View Original Transcript
                    </Button>
                </div>
            </div>
        </>
    );
};



const PublishOptionsModal = ({
    isOpen,
    onClose,
    publications,
    availablePlatforms,
    onPublishPlatform,
    onUnpublishPlatform,
    onUnpublishAll,
    onPublishAll,
    onSchedule,
    platformTokens,
    setPlatformTokens,
    isPublishing,
    scheduledAt,
    xingSummary,
    article,
    onUnpublish,
    status
}: any) => {



    const [isScheduling, setIsScheduling] = useState(false);
    const [dateTimeValue, setDateTimeValue] = useState('');
    const [error, setError] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState<Record<string, 'DE' | 'EN'>>({});

    const autoPlatforms = availablePlatforms?.filter((p: any) => p.couldAutoPublish) || [];
    const manualPlatforms = availablePlatforms?.filter((p: any) => !p.couldAutoPublish) || [];

    const isLiveOrScheduled = status === 'PUBLISHED' || status === 'SCHEDULED';


    const handleXingShare = async (platformKey: string) => {
        if (!article?.id) return;

        try {
            const lang = selectedLanguage[platformKey] || 'DE';
            const { shareUrl } = await getShareUrl(article.id, platformKey, lang);

            // Use language-specific summary if available, fallback to current edit state
            const summary = lang === 'EN' ? (article?.xingSummaryEn || xingSummary) : xingSummary;

            window.open(shareUrl, '_blank', 'width=600,height=500');

            // Copy summary to clipboard to assist the user
            if (summary) {
                navigator.clipboard.writeText(summary);
                toast.success(`Xing summary (${lang}) copied to clipboard! You can paste it in the sharing dialog.`);
            }
        } catch (error) {
            console.error('Failed to get share URL:', error);
            toast.error('Failed to generate sharing link.');
        }
    };


    useEffect(() => {
        if (isOpen && scheduledAt) {
            const date = new Date(scheduledAt);
            const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            setDateTimeValue(localDateTime);
        } else if (isOpen) {
            const date = new Date();
            date.setHours(date.getHours() + 1);
            const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
                .toISOString()
                .slice(0, 16);
            setDateTimeValue(localDateTime);
        }
    }, [isOpen, scheduledAt]);

    const handleConfirmSchedule = () => {
        if (!dateTimeValue) {
            setError('Select a date and time');
            return;
        }
        const selectedDate = new Date(dateTimeValue);
        if (selectedDate <= new Date()) {
            setError('Time must be in the future');
            return;
        }
        onSchedule(selectedDate);
        setIsScheduling(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-card border border-border/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        <div className="p-6 border-b border-border/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <UploadCloud size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold">Publish Article</h2>
                                    <p className="text-xs text-muted-foreground">Select platforms to publish your content.</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={onClose}>
                                <X size={18} />
                            </Button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-auto custom-scrollbar">
                            <div className="space-y-4">
                                {/* Scheduling Section */}
                                {status !== 'PUBLISHED' && (
                                    <div className="space-y-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 mb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-semibold text-foreground italic flex items-center gap-2">
                                                    <Calendar size={14} className="text-blue-500" />
                                                    Scheduling
                                                </h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {scheduledAt
                                                        ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}`
                                                        : "Plan your publication ahead."
                                                    }
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className={cn(
                                                    "h-8 gap-2 border-blue-500/20 transition-all shadow-sm",
                                                    isScheduling ? "bg-blue-500 text-white border-transparent" : "hover:bg-blue-500/5 hover:border-blue-500/40"
                                                )}
                                                onClick={() => setIsScheduling(!isScheduling)}
                                            >
                                                <Calendar size={14} />
                                                <span className="text-xs">{scheduledAt ? "Reschedule" : "Schedule"}</span>
                                            </Button>
                                        </div>

                                        <AnimatePresence>
                                            {isScheduling && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="pt-2 space-y-3">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Select Date & Time</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={dateTimeValue}
                                                                onChange={(e) => setDateTimeValue(e.target.value)}
                                                                className="w-full text-sm bg-background border border-border/60 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
                                                            />
                                                        </div>
                                                        {error && <p className="text-[10px] text-red-500 font-medium ml-1">{error}</p>}
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                className="flex-1 h-9 bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                                onClick={handleConfirmSchedule}
                                                            >
                                                                Confirm Schedule
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-9"
                                                                onClick={() => setIsScheduling(false)}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}


                                {status !== 'PUBLISHED' && (
                                    <div className="flex items-center justify-between bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10 mb-2">
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-semibold text-foreground">Publication Status</h4>
                                            <p className="text-[11px] text-muted-foreground">Track where your article is live.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-2 border-amber-500/20 text-amber-600 hover:bg-amber-500/5 hover:border-amber-500/40 transition-all shadow-sm"
                                                onClick={onUnpublishAll}
                                                disabled={isPublishing}
                                            >
                                                <X size={14} />
                                                <span className="text-xs font-semibold">Unpublish All</span>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 gap-2 border-emerald-500/20 hover:bg-emerald-500/5 hover:border-emerald-500/40 transition-all shadow-sm"
                                                onClick={onPublishAll}
                                                disabled={isPublishing}
                                            >
                                                <Repeat size={14} className={cn(isPublishing && "animate-spin")} />
                                                <span className="text-xs">Auto Publish All</span>
                                            </Button>
                                        </div>
                                    </div>
                                )}




                                <div className="space-y-4">
                                    {autoPlatforms.length > 0 && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <Zap size={14} className="text-emerald-500 fill-emerald-500/20" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Automatic Distribution</span>
                                            </div>
                                            {autoPlatforms.map((p: any) => {
                                                const platformPubs = publications?.filter((pub: any) => pub.platform === p.platform && pub.status === 'PUBLISHED') || [];
                                                const isAnyLive = platformPubs.length > 0;

                                                return (
                                                    <div key={p.platform} className={cn(
                                                        "rounded-xl p-4 space-y-4 transition-all border",
                                                        isAnyLive
                                                            ? "bg-emerald-500/[0.05] border-emerald-500/20 shadow-sm"
                                                            : "bg-muted/30 border-border/40 hover:bg-muted/40 hover:border-border/60"
                                                    )}>
                                                        <div className="flex flex-col gap-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-2.5 h-2.5 rounded-full shadow-sm",
                                                                        isAnyLive ? "bg-emerald-500 shadow-emerald-500/20" : "bg-muted-foreground/20 shadow-sm"
                                                                    )} />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold text-sm leading-tight text-foreground">{p.name}</span>
                                                                        <span className="text-[10px] text-muted-foreground font-medium">
                                                                            {isAnyLive ? 'Active Distribution' : 'Ready for auto-distribution'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <select
                                                                        value={selectedLanguage[p.platform] || 'DE'}
                                                                        onChange={(e) => setSelectedLanguage({ ...selectedLanguage, [p.platform]: e.target.value as 'DE' | 'EN' })}
                                                                        className="text-xs bg-muted/50 border border-border/50 rounded px-2 py-1 outline-none font-medium"
                                                                    >
                                                                        <option value="DE">DE</option>
                                                                        <option value="EN">EN</option>
                                                                    </select>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="default"
                                                                        className="h-8 px-4 gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/10"
                                                                        onClick={() => onPublishPlatform(p.platform, selectedLanguage[p.platform] || 'DE')}
                                                                        disabled={isPublishing}
                                                                    >
                                                                        {isPublishing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                                                        <span className="text-xs font-medium">Publish</span>
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {platformPubs.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                                                                    {platformPubs.map((pub: any) => (
                                                                        <div key={pub.id} className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                                            <CheckCircle2 size={10} />
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Live ({pub.language})</span>
                                                                            <button
                                                                                onClick={() => onUnpublishPlatform(p.platform, pub.language)}
                                                                                className="hover:text-red-500 transition-colors ml-1"
                                                                                title="Unpublish"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                        </div>
                                    )}

                                    {manualPlatforms.length > 0 && (
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <MousePointer2 size={14} className="text-amber-500" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manual Sharing / Verification</span>
                                            </div>
                                            {manualPlatforms.map((p: any) => {
                                                const platformPubs = publications?.filter((pub: any) => pub.platform === p.platform && pub.status === 'PUBLISHED') || [];
                                                const isAnyLive = platformPubs.length > 0;
                                                const isXing = p.platform === 'XING';

                                                return (
                                                    <div key={p.platform} className={cn(
                                                        "rounded-xl p-4 space-y-4 transition-all border",
                                                        isAnyLive
                                                            ? "bg-emerald-500/[0.05] border-emerald-500/20 shadow-sm"
                                                            : "bg-amber-500/[0.03] border-amber-500/10 hover:bg-amber-500/[0.06] hover:border-amber-500/20"
                                                    )}>
                                                        <div className="flex flex-col gap-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={cn(
                                                                        "w-2.5 h-2.5 rounded-full shadow-sm",
                                                                        isAnyLive ? "bg-emerald-500 shadow-emerald-500/20" : "bg-amber-500 shadow-amber-500/20"
                                                                    )} />
                                                                    <div className="flex flex-col">
                                                                        <span className="font-semibold text-sm leading-tight text-foreground">{p.name}</span>
                                                                        <span className={cn(
                                                                            "text-[10px] font-medium",
                                                                            isAnyLive ? "text-muted-foreground" : "text-amber-600/70"
                                                                        )}>
                                                                            {isAnyLive ? 'Active Distribution' : 'Manual action required'}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <select
                                                                        value={selectedLanguage[p.platform] || 'DE'}
                                                                        onChange={(e) => setSelectedLanguage({ ...selectedLanguage, [p.platform]: e.target.value as 'DE' | 'EN' })}
                                                                        className="text-xs bg-muted/50 border border-border/50 rounded px-2 py-1 outline-none font-medium"
                                                                    >
                                                                        <option value="DE">DE</option>
                                                                        <option value="EN">EN</option>
                                                                    </select>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="default"
                                                                        className="h-8 px-4 gap-2 bg-amber-500 hover:bg-amber-600 border-none shadow-md shadow-amber-500/10 text-white"
                                                                        onClick={isXing ? () => handleXingShare(p.platform) : () => onPublishPlatform(p.platform, selectedLanguage[p.platform] || 'DE')}
                                                                        disabled={isPublishing}
                                                                    >
                                                                        {isXing ? <ExternalLink size={12} /> : (isPublishing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />)}
                                                                        <span className="text-xs font-medium">{isXing ? 'Share on Xing' : 'Publish'}</span>
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {platformPubs.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                                                                    {platformPubs.map((pub: any) => (
                                                                        <div key={pub.id} className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                                            <CheckCircle2 size={10} />
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Live ({pub.language})</span>
                                                                            <button
                                                                                onClick={() => onUnpublishPlatform(p.platform, pub.language)}
                                                                                className="hover:text-red-500 transition-colors ml-1"
                                                                                title="Unpublish"
                                                                            >
                                                                                <X size={12} />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>


                                                        {!isXing && (
                                                            <div className="space-y-2 pt-1 border-t border-border/20 mt-2">
                                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Access Token</label>
                                                                <input
                                                                    type="password"
                                                                    value={platformTokens[p.platform] || ''}
                                                                    onChange={(e) => setPlatformTokens({
                                                                        ...platformTokens,
                                                                        [p.platform]: e.target.value
                                                                    })}
                                                                    className="w-full text-xs bg-background border border-border/60 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                                                                    placeholder={`Paste your ${p.name} token here...`}
                                                                />
                                                            </div>
                                                        )}

                                                        {publications?.filter((pub: any) => pub.platform === p.platform && pub.status === 'ERROR').map((errorPub: any) => (
                                                            <div key={errorPub.id} className="flex items-start gap-2 text-red-500 bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                                                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                                <p className="text-[11px] leading-relaxed italic">
                                                                    <span className="font-bold">{errorPub.language}:</span> {errorPub.errorMessage || 'Action required.'}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>

                        <div className="p-6 border-t border-border/40 bg-muted/20 flex items-center justify-between gap-3">
                            <div>
                                {isLiveOrScheduled && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={onUnpublish}
                                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 gap-2 h-9"
                                    >
                                        <X size={14} />
                                        <span className="text-xs font-semibold">Back to Draft</span>
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={onClose} className="h-9 font-medium">Close</Button>
                                <Button
                                    variant="default"
                                    onClick={onClose}
                                    className="h-9 px-6 font-semibold"
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};


