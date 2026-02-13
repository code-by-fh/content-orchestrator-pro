import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, ChevronRight, Search, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { ThemeToggle } from './ui/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandMenu } from './ui/CommandMenu';
import logo from '../assets/orchestrator.svg';

const NavItem = ({ to, icon: Icon, label, collapsed, onClick }: { to: string; icon: any; label: string; collapsed: boolean; onClick?: () => void }) => {
    return (
        <NavLink
            to={to}
            onClick={onClick}
            className={({ isActive }) =>
                cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                    isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )
            }
        >
            <Icon size={20} strokeWidth={1.5} />
            {!collapsed && (
                <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-medium text-sm whitespace-nowrap"
                >
                    {label}
                </motion.span>
            )}
            {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-border">
                    {label}
                </div>
            )}
        </NavLink>
    );
};

export const DashboardLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setCollapsed(true); // Default to closed on mobile
            } else {
                setCollapsed(true); // Default to mini-sidebar on desktop
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close sidebar on route change if on mobile
    useEffect(() => {
        if (isMobile) {
            setCollapsed(true);
        }
    }, [location.pathname, isMobile]);

    const toggleSidebar = () => setCollapsed(!collapsed);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-indigo-500/20">
            <CommandMenu />

            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isMobile && !collapsed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCollapsed(true)}
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={cn(
                    "fixed md:relative h-full flex flex-col border-r border-border bg-card/50 backdrop-blur-xl z-50 transition-all duration-300 ease-in-out",
                    collapsed && "no-scrollbar"
                )}
                initial={false}
                animate={{
                    width: isMobile ? 256 : (collapsed ? 68 : 256),
                    x: isMobile && collapsed ? -256 : 0
                }}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-8 w-8 rounded-lg  flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                            <img src={logo} alt="Content Orchestrator Pro Logo" />
                        </div>
                        {(!collapsed || isMobile) && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="font-bold text-lg tracking-tight whitespace-nowrap"
                            >
                                Cortex
                            </motion.span>
                        )}
                    </div>
                    {isMobile && !collapsed && (
                        <Button variant="ghost" size="icon" onClick={() => setCollapsed(true)}>
                            <X size={18} />
                        </Button>
                    )}
                </div>

                <div className={cn("flex-1 py-6 px-3 space-y-2 overflow-y-auto", collapsed && "no-scrollbar")}>
                    <button
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-background/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-all mb-6 text-sm group",
                            (collapsed && !isMobile) ? "justify-center" : "justify-start"
                        )}
                    >
                        <Search size={18} />
                        {(!collapsed || isMobile) && <span className="flex-1 text-left">Search...</span>}
                        {(!collapsed || isMobile) && <kbd className="text-[10px] border border-border rounded px-1.5 bg-background">⌘K</kbd>}
                    </button>

                    <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed && !isMobile} />
                    <NavItem to="/dashboard/articles" icon={FileText} label="Articles" collapsed={collapsed && !isMobile} />
                    <NavItem to="/dashboard/settings" icon={Settings} label="Settings" collapsed={collapsed && !isMobile} />
                </div>

                <div className="p-3 border-t border-border/50 space-y-2">
                    <ThemeToggle className="w-full justify-center" />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-full justify-center hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                            localStorage.removeItem('token');
                            window.location.href = '/login';
                        }}
                    >
                        <LogOut size={20} />
                    </Button>

                    {!isMobile && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="w-full mt-2 text-muted-foreground hover:text-foreground"
                        >
                            {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
                        </Button>
                    )}
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden flex flex-col w-full">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

                {/* Mobile Header */}
                <div className="md:hidden h-16 border-b border-border/40 backdrop-blur-xl bg-background/50 flex items-center px-4 justify-between shrink-0 z-30">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => setCollapsed(false)}>
                            <Menu size={20} />
                        </Button>
                        <span className="font-semibold text-lg">Cortex</span>
                    </div>
                    {/* Add any mobile specific header actions here if needed */}
                </div>

                <div className="flex-1 overflow-auto relative z-10 scroll-smooth">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
