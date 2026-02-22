import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { ArticleList } from './components/ArticleList';
import { ArticleEditor } from './components/ArticleEditor';
import { DashboardOverview } from './components/DashboardOverview';
import { ThemeProvider } from './context/ThemeContext';
// Unused imports related to old UI components removed
// import { HeroSection } from './components/HeroSection'; // Removed HeroSection
import { GlassCard } from './components/ui/GlassCard';
import { GlowButton } from './components/ui/GlowButton';

// Placeholder for Login (Updated with UI components)
import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login, checkSetupStatus, registerAdmin } from './api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [needsSetup, setNeedsSetup] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  const fetchSetupStatus = async () => {
    try {
      const { needsSetup } = await checkSetupStatus();
      setNeedsSetup(needsSetup);
    } catch (err) {
      console.error('Failed to check setup status', err);
    }
  };

  useEffect(() => {
    fetchSetupStatus();
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setFieldErrors({});
    try {
      let data;
      if (needsSetup) {
        data = await registerAdmin(username, password);
      } else {
        data = await login(username, password);
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 400 && err.response?.data?.errors) {
        const fields: Record<string, string> = {};
        err.response.data.errors.forEach((e: any) => {
          const key = e.path[e.path.length - 1];
          fields[key] = e.message;
        });
        setFieldErrors(fields);
      } else {
        setError(needsSetup ? (err.response?.data?.message || 'Registration failed.') : 'Login failed. Check credentials.');
      }
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center mesh-gradient-bg overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <GlassCard className="w-[400px] z-10 border-white/10 bg-black/40 backdrop-blur-3xl">
        <div className="flex flex-col space-y-2 text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {needsSetup ? 'Create Admin Account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-gray-400">
            {needsSetup
              ? 'The first user will be the administrator of this application.'
              : 'Enter your credentials to access your workspace.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid w-full items-center gap-4">
          <div className="flex flex-col space-y-1.5">
            <input
              type="text"
              placeholder="Username"
              className={`flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 text-white ${fieldErrors.username ? "border-red-500" : ""}`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {fieldErrors.username && <p className="text-xs text-red-500 px-1">{fieldErrors.username}</p>}
          </div>
          <div className="flex flex-col space-y-1.5 relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1 pr-10 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 text-white ${fieldErrors.password ? "border-red-500" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[24px] -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {fieldErrors.password && <p className="text-xs text-red-500 px-1 mt-1">{fieldErrors.password}</p>}
          </div>

          {error && <div className="mt-4 text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg border border-red-500/20">{error}</div>}

          <div className="flex justify-between mt-8 gap-4">
            <GlowButton type="button" variant="ghost" className="w-full text-gray-300 hover:text-white" onClick={() => { setUsername(''); setPassword('') }}>Cancel</GlowButton>
            <GlowButton type="submit" className="w-full">
              {needsSetup ? 'Register' : 'Sign In'}
            </GlowButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};


const ProtectedRoute = ({ children }: { children: any }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

import { Toaster } from 'sonner';

import { Settings } from './components/Settings';

// ... (previous imports)

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          {/* Landing Page with Hero Section */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/login" element={<Login />} />



          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardOverview />} />
            <Route path="articles" element={<ArticleList />} />
            <Route path="editor/:id" element={<ArticleEditor />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
