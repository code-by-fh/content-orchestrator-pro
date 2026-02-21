import { Label } from '@radix-ui/react-label';
import { motion } from 'framer-motion';
import { Globe, User } from 'lucide-react';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { ThemeToggle } from './ui/ThemeToggle';

export const Settings: React.FC = () => {
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

            {/* Appearance */}
            <motion.div variants={item}>
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-indigo-500" />
                            <CardTitle>Appearance</CardTitle>
                        </div>
                        <CardDescription>Customize the look and feel of your workspace.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
                            <div className="space-y-0.5">
                                <h4 className="font-medium text-foreground">Theme Mode</h4>
                                <p className="text-sm text-muted-foreground">Select between Light, Dark, or System preference.</p>
                            </div>
                            <ThemeToggle />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Profile */}
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
                            <Input value="admin" disabled className="bg-muted/50" />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
};
