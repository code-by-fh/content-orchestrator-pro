import { Label } from '@radix-ui/react-label';
import { motion } from 'framer-motion';
import { UserPlus, Bot } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/Card';
import { Input } from './ui/Input';
import { GlowButton } from './ui/GlowButton';
import { createUser, getSettings, updateSettings } from '../api';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'ADMIN';

    // User creation state
    const [newUsername, setNewUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [userErrors, setUserErrors] = useState<Record<string, string>>({});

    // OpenRouter settings state
    const [orUseOpenRouter, setOrUseOpenRouter] = useState(false);
    const [orApiKey, setOrApiKey] = useState('');
    const [orModel, setOrModel] = useState('openai/gpt-4o-mini');
    const [orBaseUrl, setOrBaseUrl] = useState('https://openrouter.ai/api/v1');
    const [isSavingOrSettings, setIsSavingOrSettings] = useState(false);

    useEffect(() => {
        getSettings().then((s) => {
            setOrUseOpenRouter(s.useOpenRouter);
            setOrApiKey(s.openrouterApiKey || '');
            setOrModel(s.openrouterModel || 'openai/gpt-4o-mini');
            setOrBaseUrl(s.openrouterBaseUrl || 'https://openrouter.ai/api/v1');
        }).catch(() => { });
    }, []);

    const handleSaveOrSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;
        setIsSavingOrSettings(true);
        try {
            await updateSettings({
                useOpenRouter: orUseOpenRouter,
                openrouterApiKey: orApiKey || null,
                openrouterModel: orModel || null,
                openrouterBaseUrl: orBaseUrl || null,
            });
            toast.success('AI-Einstellungen gespeichert');
        } catch {
            toast.error('Fehler beim Speichern der AI-Einstellungen');
        } finally {
            setIsSavingOrSettings(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAdmin) return;
        setIsCreatingUser(true);
        setUserErrors({});
        try {
            await createUser({ username: newUsername, password: newUserPassword, role: newUserRole });
            toast.success(`User ${newUsername} created successfully`);
            setNewUsername('');
            setNewUserPassword('');
            setNewUserRole('USER');
        } catch (error: any) {
            if (error.response?.status === 400 && error.response?.data?.errors) {
                const fields: Record<string, string> = {};
                error.response.data.errors.forEach((err: any) => {
                    const key = err.path[err.path.length - 1];
                    fields[key] = err.message;
                });
                setUserErrors(fields);
            } else {
                toast.error(error.response?.data?.message || 'Failed to create user');
            }
        } finally {
            setIsCreatingUser(false);
        }
    };

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="p-8 max-w-4xl mx-auto space-y-8"
        >
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
                <p className="text-muted-foreground">Manage application settings and users.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* OpenRouter / AI Config */}
                <motion.div variants={item}>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5 text-indigo-500" />
                                <CardTitle>AI-Konfiguration</CardTitle>
                            </div>
                            <CardDescription>
                                OpenRouter als Gemini-Alternative konfigurieren.
                                {!isAdmin && <span className="block text-xs mt-1 text-amber-500">Nur Admins können diese Einstellungen ändern.</span>}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleSaveOrSettings}>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                                    <div className="space-y-0.5">
                                        <h4 className="font-medium text-foreground">OpenRouter verwenden</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {orUseOpenRouter
                                                ? 'OpenRouter aktiv (Medium-Artikel)'
                                                : 'Google Gemini aktiv (Standard)'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!isAdmin}
                                        onClick={() => isAdmin && setOrUseOpenRouter((v) => !v)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${orUseOpenRouter ? 'bg-indigo-500' : 'bg-muted'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${orUseOpenRouter ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                {orUseOpenRouter && (
                                    <>
                                        <div className="grid gap-2">
                                            <Label className="text-sm font-medium">API Key</Label>
                                            <Input
                                                type="password"
                                                value={orApiKey}
                                                onChange={(e) => setOrApiKey(e.target.value)}
                                                placeholder="sk-or-..."
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-sm font-medium">Modell</Label>
                                            <Input
                                                value={orModel}
                                                onChange={(e) => setOrModel(e.target.value)}
                                                placeholder="openai/gpt-4o-mini"
                                                disabled={!isAdmin}
                                            />
                                            <p className="text-xs text-muted-foreground">z.B. openai/gpt-4o, anthropic/claude-3.5-sonnet</p>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label className="text-sm font-medium">Base URL</Label>
                                            <Input
                                                value={orBaseUrl}
                                                onChange={(e) => setOrBaseUrl(e.target.value)}
                                                placeholder="https://openrouter.ai/api/v1"
                                                disabled={!isAdmin}
                                            />
                                        </div>
                                    </>
                                )}
                            </CardContent>
                            {isAdmin && (
                                <CardFooter>
                                    <GlowButton type="submit" disabled={isSavingOrSettings} className="w-full">
                                        {isSavingOrSettings ? 'Speichern...' : 'AI-Einstellungen speichern'}
                                    </GlowButton>
                                </CardFooter>
                            )}
                        </form>
                    </Card>
                </motion.div>

                {/* Security & Admin */}
                {isAdmin && (
                    <motion.div variants={item}>
                        <Card className="border-indigo-500/20 shadow-indigo-500/10 shadow-lg">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <UserPlus className="h-5 w-5 text-indigo-500" />
                                    <CardTitle>Create New User</CardTitle>
                                </div>
                                <CardDescription>Add another team member.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleCreateUser}>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">Username</Label>
                                        <Input
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value)}
                                            required
                                            className={userErrors.username ? "border-red-500" : ""}
                                        />
                                        {userErrors.username && <p className="text-xs text-red-500 mt-0.5">{userErrors.username}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">Password</Label>
                                        <Input
                                            type="password"
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                            required
                                            className={userErrors.password ? "border-red-500" : ""}
                                        />
                                        {userErrors.password && <p className="text-xs text-red-500 mt-0.5">{userErrors.password}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">Role</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={newUserRole}
                                            onChange={(e) => setNewUserRole(e.target.value as any)}
                                        >
                                            <option value="USER">User</option>
                                            <option value="ADMIN">Admin</option>
                                        </select>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <GlowButton type="submit" variant="primary" disabled={isCreatingUser} className="w-full">
                                        {isCreatingUser ? 'Creating...' : 'Create User'}
                                    </GlowButton>
                                </CardFooter>
                            </form>
                        </Card>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};
