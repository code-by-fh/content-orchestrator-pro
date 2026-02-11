import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, LogOut, ChevronRight, Search, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/Button';
import { ThemeToggle } from './ui/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandMenu } from './ui/CommandMenu';

const NavItem = ({ to, icon: Icon, label, collapsed }: { to: string; icon: any; label: string; collapsed: boolean }) => {
    return (
        <NavLink
            to={to}
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
    const [collapsed, setCollapsed] = useState(true);
    const location = useLocation();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-indigo-500/20">
            <CommandMenu />

            {/* Sidebar */}
            <motion.aside
                className={cn(
                    "relative flex flex-col border-r border-border bg-card/50 backdrop-blur-xl z-20 transition-all duration-300 ease-in-out",
                    collapsed ? "w-[68px]" : "w-64"
                )}
                initial={false}
                animate={{ width: collapsed ? 68 : 256 }}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-border/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                            <span className="text-white font-bold">C</span>
                        </div>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="font-bold text-lg tracking-tight whitespace-nowrap"
                            >
                                Cortex
                            </motion.span>
                        )}
                    </div>
                </div>

                <div className="flex-1 py-6 px-3 space-y-2">
                    <button
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }))}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-background/50 text-muted-foreground hover:bg-accent hover:text-foreground transition-all mb-6 text-sm group",
                            collapsed ? "justify-center" : "justify-start"
                        )}
                    >
                        <Search size={18} />
                        {!collapsed && <span className="flex-1 text-left">Search...</span>}
                        {!collapsed && <kbd className="text-[10px] border border-border rounded px-1.5 bg-background">⌘K</kbd>}
                    </button>

                    <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
                    <NavItem to="/dashboard/articles" icon={FileText} label="Articles" collapsed={collapsed} />
                    <NavItem to="/dashboard/settings" icon={Settings} label="Settings" collapsed={collapsed} />
                </div>

                <div className="p-3 border-t border-border/50 space-y-2">
                    <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
                        <ThemeToggle />
                        {!collapsed && <span className="text-xs text-muted-foreground">Theme</span>}
                    </div>

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

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full mt-2 text-muted-foreground hover:text-foreground"
                    >
                        {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
                    </Button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

                {/* Dynamic Breadcrumbs / Header area could go here */}

                <div className="flex-1 overflow-auto relative z-10 scroll-smooth">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
