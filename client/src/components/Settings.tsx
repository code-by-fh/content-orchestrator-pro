import { Label } from '@radix-ui/react-label';
import { motion } from 'framer-motion';
import { Globe, User, Shield, Lock, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/Card';
import { Input } from './ui/Input';
import { ThemeToggle } from './ui/ThemeToggle';
import { GlowButton } from './ui/GlowButton';
import { changePassword, createUser } from '../api';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'ADMIN';

    // Password change state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // User creation state
    const [newUsername, setNewUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<'USER' | 'ADMIN'>('USER');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    // Validation errors
    const [pwdErrors, setPwdErrors] = useState<Record<string, string>>({});
    const [userErrors, setUserErrors] = useState<Record<string, string>>({});

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setIsChangingPassword(true);
        setPwdErrors({});
        try {
            await changePassword({ oldPassword, newPassword });
            toast.success('Password changed successfully');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            if (error.response?.status === 400 && error.response?.data?.errors) {
                const fields: Record<string, string> = {};
                error.response.data.errors.forEach((err: any) => {
                    const key = err.path[err.path.length - 1];
                    fields[key] = err.message;
                });
                setPwdErrors(fields);
            } else {
                toast.error(error.response?.data?.message || 'Failed to change password');
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
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
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">Manage your account and preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Appearance & Profile */}
                <div className="space-y-8">
                    <motion.div variants={item}>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Globe className="h-5 w-5 text-indigo-500" />
                                    <CardTitle>Appearance</CardTitle>
                                </div>
                                <CardDescription>Customize the look and feel.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                                    <div className="space-y-0.5">
                                        <h4 className="font-medium text-foreground">Theme Mode</h4>
                                        <p className="text-sm text-muted-foreground">Light, Dark, or System.</p>
                                    </div>
                                    <ThemeToggle />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item}>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-indigo-500" />
                                    <CardTitle>Profile</CardTitle>
                                </div>
                                <CardDescription>Your personal information.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium text-foreground">Username</Label>
                                    <Input value={user.username || 'unknown'} disabled className="bg-muted/50" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-sm font-medium text-foreground">Role</Label>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Shield className="h-4 w-4" />
                                        {user.role || 'USER'}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Security & Admin */}
                <div className="space-y-8">
                    <motion.div variants={item}>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-indigo-500" />
                                    <CardTitle>Change Password</CardTitle>
                                </div>
                                <CardDescription>Update your login credentials.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handlePasswordChange}>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">Current Password</Label>
                                        <Input
                                            type="password"
                                            value={oldPassword}
                                            onChange={(e) => setOldPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">New Password</Label>
                                        <Input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            className={pwdErrors.newPassword ? "border-red-500" : ""}
                                        />
                                        {pwdErrors.newPassword && <p className="text-xs text-red-500 mt-0.5">{pwdErrors.newPassword}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label className="text-sm font-medium">Confirm New Password</Label>
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <GlowButton type="submit" disabled={isChangingPassword} className="w-full">
                                        {isChangingPassword ? 'Changing...' : 'Update Password'}
                                    </GlowButton>
                                </CardFooter>
                            </form>
                        </Card>
                    </motion.div>

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
            </div>
        </motion.div>
    );
};
