// Login Page — Odoo-inspired clean login form
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { loginWithEmail } from '../services/authService';
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setError('');
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/');
    } catch (err) {
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : err.code === 'auth/user-not-found'
          ? 'No account found with this email.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Please try again later.'
          : 'Login failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8 lg:p-12"
      style={{ background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 50%, #875a7b22 100%)' }}
    >
      <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 w-full max-w-5xl">
        {/* Left branding panel */}
        <div className="hidden lg:flex flex-col justify-center w-[360px] shrink-0">
        <div className="mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-6"
            style={{ background: '#875a7b' }}
          >
            I
          </div>
          <h1 className="text-white text-3xl font-bold leading-tight mb-3">
            Inhavo CRM
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Manage your sales pipeline, leads, and customers in one place.
          </p>
        </div>

        <div className="space-y-4">
          {['Kanban Pipeline', 'Multi-store Support', 'Task Management', 'PDF Quotations'].map((f) => (
            <div key={f} className="flex items-center gap-3 text-white/60 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

        {/* Right login form */}
        <div className="w-full max-w-md shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-transparent dark:border-slate-700 p-10 transition-colors">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: '#875a7b' }}
              >
                I
              </div>
              <span className="font-bold text-xl text-gray-800 dark:text-slate-100">Inhavo CRM</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">Welcome back</h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mb-8">Sign in to your account</p>

            {/* Error alert */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-900/60 rounded-lg px-4 py-3 mb-6">
                <AlertCircle size={16} className="text-red-500 dark:text-rose-400 shrink-0 mt-0.5" />
                <p className="text-red-700 dark:text-rose-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' },
                    })}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-rose-400">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...register('password', { required: 'Password is required' })}
                    className="w-full pl-10 pr-11 py-2.5 bg-white dark:bg-slate-700/60 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600 dark:text-rose-400">{errors.password.message}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: loading ? '#9b8a9d' : '#875a7b' }}
              >
                {loading ? (
                  <>
                    <span className="spinner w-4 h-4 border-white" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400 dark:text-slate-400">
              Contact your administrator to request an account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
