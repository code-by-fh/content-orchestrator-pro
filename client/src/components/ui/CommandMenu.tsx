import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Settings as SettingsIcon, Plus, Home, Moon, Sun, Laptop } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const CommandMenu = () => {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { setTheme } = useTheme();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[640px] bg-popover/80 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden z-[9999] p-2"
        >
            <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Command.Input
                    placeholder="Type a command or search..."
                    className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
            </div>
            <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden py-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

                <Command.Group heading="Navigation" className="text-xs font-medium text-muted-foreground px-2 mb-2">
                    <Command.Item onSelect={() => runCommand(() => navigate('/dashboard'))} className="flex items-center px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group">
                        <Home className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        Dashboard
                    </Command.Item>
                    <Command.Item onSelect={() => runCommand(() => navigate('/dashboard/articles'))} className="flex items-center px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group">
                        <FileText className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        Articles
                    </Command.Item>
                    <Command.Item onSelect={() => runCommand(() => navigate('/dashboard/settings'))} className="flex items-center px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group">
                        <SettingsIcon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        Settings
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="Actions" className="text-xs font-medium text-muted-foreground px-2 mb-2">
                    <Command.Item onSelect={() => runCommand(() => navigate('/'))} className="flex items-center px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group">
                        <Plus className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        New Article
                    </Command.Item>
                </Command.Group>

                <Command.Group heading="Theme" className="text-xs font-medium text-muted-foreground px-2 mb-2">
                    <Command.Item onSelect={() => runCommand(() => setTheme('light'))} className="flex items-center px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group">
                        <Sun className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        Light Mode
                    </Command.Item>
                    <Command.Item onSelect={() => runCommand(() => setTheme('dark'))} className="flex items-center px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group">
                        <Moon className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        Dark Mode
                    </Command.Item>
                    <Command.Item onSelect={() => runCommand(() => setTheme('system'))} className="flex items-center px-2 py-2 rounded-md hover:bg-accent cursor-pointer text-foreground group">
                        <Laptop className="mr-2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        System
                    </Command.Item>
                </Command.Group>
            </Command.List>
        </Command.Dialog>
    );
};
