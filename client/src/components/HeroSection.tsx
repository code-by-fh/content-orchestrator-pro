import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Zap, Shield } from "lucide-react";
import { GlassCard } from "./ui/GlassCard";
import { GlowButton } from "./ui/GlowButton";

export const HeroSection = () => {
    const navigate = useNavigate();
    return (
        <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden mesh-gradient-bg">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <div className="container mx-auto px-4 z-10 flex flex-col items-center text-center gap-8">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-sm font-medium text-indigo-300"
                >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Next-Gen Content Orchestration</span>
                </motion.div>

                {/* Main Heading */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4"
                >
                    Orchestrate Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 text-glow">
                        Digital Universe
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
                >
                    Seamlessly manage, analyze, and publish content across platforms with a single, intelligent interface designed for creators.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-wrap items-center gap-4 mt-6"
                >
                    <GlowButton onClick={() => navigate('/login')}>
                        Get Started <ArrowRight className="w-4 h-4" />
                    </GlowButton>
                </motion.div>

                {/* Feature Cards Showcase */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-5xl">
                    <GlassCard className="flex flex-col items-start text-left">
                        <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400 mb-4">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Lightning Fast</h3>
                        <p className="text-gray-400">Optimized for speed with a modern tech stack that never keeps you waiting.</p>
                    </GlassCard>

                    <GlassCard className="flex flex-col items-start text-left">
                        <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400 mb-4">
                            <Shield className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Secure by Default</h3>
                        <p className="text-gray-400">Enterprise-grade security ensuring your content and data remain protected.</p>
                    </GlassCard>

                    <GlassCard className="flex flex-col items-start text-left">
                        <div className="p-3 rounded-lg bg-pink-500/20 text-pink-400 mb-4">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">AI Powered</h3>
                        <p className="text-gray-400">Intelligent suggestions and automation to 10x your productivity.</p>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
};
