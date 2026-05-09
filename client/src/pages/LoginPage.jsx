import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { login, signup, googleAuth } from '../api';
import { ToastContainer, useToast } from '../components/Toast';

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function InputField({ label, type, value, onChange, placeholder, disabled, icon }) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        )}
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full py-2.5 border border-gray-300 rounded-lg text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none
            disabled:bg-gray-50 disabled:text-gray-400 transition-all
            ${icon ? 'pl-10' : 'pl-4'}
            ${isPassword ? 'pr-10' : 'pr-4'}
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            <EyeIcon open={showPassword} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toasts, toast, removeToast } = useToast();

  function validate() {
    if (isSignup) {
      if (!username.trim()) { toast.error('Username is required', 'Validation'); return false; }
      if (username.trim().length < 3) { toast.error('Username must be at least 3 characters', 'Validation'); return false; }
      if (!email.trim()) { toast.error('Email is required', 'Validation'); return false; }
      if (!/\S+@\S+\.\S+/.test(email)) { toast.error('Enter a valid email address', 'Validation'); return false; }
      if (!password) { toast.error('Password is required', 'Validation'); return false; }
      if (password.length < 6) { toast.error('Password must be at least 6 characters', 'Validation'); return false; }
    } else {
      if (!username.trim()) { toast.error('Username is required', 'Validation'); return false; }
      if (!password) { toast.error('Password is required', 'Validation'); return false; }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (isSignup) {
        await signup(username.trim(), email.trim(), password);
        toast.success('Account created! Welcome aboard 🎉', 'Success');
      } else {
        await login(username.trim(), password);
        toast.success(`Welcome back, ${username}!`, 'Logged in');
      }
      setTimeout(onLoginSuccess, 800);
    } catch (err) {
      toast.error(err.message, isSignup ? 'Signup Failed' : 'Login Failed');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setIsLoading(true);
    try {
      await googleAuth(credentialResponse.credential);
      toast.success('Signed in with Google!', 'Welcome');
      setTimeout(onLoginSuccess, 800);
    } catch (err) {
      toast.error(err.message, 'Google Sign-In Failed');
    } finally {
      setIsLoading(false);
    }
  }

  function switchTab(signup) {
    setIsSignup(signup);
    setUsername('');
    setEmail('');
    setPassword('');
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">

        {/* Left panel — branding (hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
          {/* decorative circles */}
          <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-blue-500 rounded-full opacity-10" />
          <div className="absolute bottom-[-60px] right-[-60px] w-56 h-56 bg-indigo-400 rounded-full opacity-10" />

          <div className="relative z-10 max-w-md text-center">
            <div className="text-7xl mb-6">📚</div>
            <h1 className="text-4xl font-bold mb-4 leading-tight">Document Q&A</h1>
            <p className="text-blue-200 text-lg mb-10">
              Upload your PDFs and Word files, then chat with an AI that answers only from your content.
            </p>

            <div className="grid grid-cols-1 gap-4 text-left">
              {[
                { icon: '⚡', title: 'Instant answers', desc: 'Ask anything about your document in seconds' },
                { icon: '🔒', title: 'Your data, private', desc: 'Documents are tied to your account only' },
                { icon: '📂', title: 'Multi-document', desc: 'Chat across multiple files at once' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-3 bg-white/5 rounded-xl px-4 py-3 backdrop-blur-sm">
                  <span className="text-2xl">{f.icon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{f.title}</p>
                    <p className="text-blue-200 text-xs mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="text-center mb-8 lg:hidden">
              <div className="text-5xl mb-2">📚</div>
              <h1 className="text-2xl font-bold text-white">Document Q&A</h1>
              <p className="text-blue-200 text-sm mt-1">Chat with your documents</p>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8">
              {/* Heading */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {isSignup ? 'Create account' : 'Welcome back'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {isSignup ? 'Start chatting with your documents' : 'Sign in to continue'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => switchTab(false)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    !isSignup ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Login
                </button>
                <button
                  onClick={() => switchTab(true)}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isSignup ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Google */}
              <div className="flex justify-center mb-5">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('Google sign-in failed. Please try again.', 'Error')}
                  text={isSignup ? 'signup_with' : 'signin_with'}
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  width="368"
                />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">or continue with email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <InputField
                  label="Username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={isLoading}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />

                {isSignup && (
                  <InputField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={isLoading}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                )}

                <InputField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isSignup ? 'At least 6 characters' : 'Enter your password'}
                  disabled={isLoading}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {isSignup ? 'Creating account...' : 'Signing in...'}
                    </>
                  ) : (
                    isSignup ? 'Create Account' : 'Login'
                  )}
                </button>
              </form>

              <p className="text-xs text-gray-400 text-center mt-5">
                By continuing, you agree to our terms of service
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
