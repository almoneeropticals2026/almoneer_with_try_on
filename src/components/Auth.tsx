import { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { Loader2, Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DualText } from './DualText';

const tAuth = {
  welcome: { ar: "مرحباً بك في المنير", en: "Welcome to Al Moneer" },
  subtitle: { ar: "استشارات النظارات المدعومة بالذكاء الاصطناعي", en: "AI-Powered Eyewear Consultations" },
  email: { ar: "البريد الإلكتروني", en: "Email Address" },
  password: { ar: "كلمة المرور", en: "Password" },
  confirmPassword: { ar: "تأكيد كلمة المرور", en: "Confirm Password" },
  fullName: { ar: "الاسم الكامل", en: "Full Name" },
  whatsapp: { ar: "رقم الواتساب (اختياري)", en: "WhatsApp Number (Optional)" },
  signIn: { ar: "تسجيل الدخول", en: "Sign In" },
  signUp: { ar: "إنشاء حساب", en: "Sign Up" },
  noAccount: { ar: "ليس لديك حساب؟ إنشاء حساب جديد", en: "Don't have an account? Create one" },
  hasAccount: { ar: "لديك حساب بالفعل؟ تسجيل الدخول", en: "Already have an account? Sign In" },
  securityNoticeTitle: { ar: "تنبيه أمني", en: "Security Notice" },
  securityNoticeDesc: { ar: "يرجى حفظ بريدك الإلكتروني وكلمة المرور في مكان آمن. كإجراء أمني، لا يمكن استرجاع أو عرض أو تغيير كلمة المرور لاحقاً.", en: "Please store your email and password safely. Passwords cannot be retrieved or changed later." },
  passwordsMismatch: { ar: "كلمتا المرور غير متطابقتين", en: "Passwords do not match" },
  successTitle: { ar: "تم إنشاء الحساب بنجاح!", en: "Account created successfully!" },
  successDesc: { ar: "يرجى التأكد من حفظ بريدك الإلكتروني وكلمة المرور في مكان آمن. كإجراء أمني، لا يمكن استرجاع أو عرض أو تغيير كلمة المرور لاحقاً.", en: "Please store your credentials safely. Passwords cannot be retrieved or changed later." },
  backToLogin: { ar: "العودة لتسجيل الدخول", en: "Back to Login" },
  heroTitle: { ar: "رؤية واضحة، أناقة لا مثيل لها", en: "Clear Vision, Unmatched Elegance" },
  heroDesc: { ar: "اكتشف الإطار الذي يعبر عن شخصيتك باستخدام تقنية الذكاء الاصطناعي المتقدمة.", en: "Discover the frame that expresses your personality using advanced AI technology." }
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      }

      const trimmedEmail = email.trim();
      // Create a timeout promise that rejects after 15 seconds
      const timeoutMs = 15000;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs / 1000} seconds. Your Supabase database might be waking up from sleep, or there is a network issue.`)), timeoutMs);
      });

      if (isSignUp) {
        if (password !== confirmPassword) {
          setError(JSON.stringify(tAuth.passwordsMismatch));
          setLoading(false);
          return;
        }

        const authPromise = supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
            },
          },
        });
        
        const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;
        
        if (error) throw error;

        if (data?.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: fullName,
              whatsapp_number: whatsappNumber || null,
            });
            
          if (profileError) {
            console.error('Error saving profile:', profileError);
          }
        }
        
        // Fire and forget the welcome email so it doesn't block the UI
        // sendWelcomeEmail(email).catch(console.error);
        
        setMessage(JSON.stringify({ title: tAuth.successTitle, desc: tAuth.successDesc }));
      } else {
        const authPromise = supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });
        
        const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any;
        
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = err.message || 'An error occurred during authentication.';
      
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        errorMessage = JSON.stringify({ 
          ar: 'فشل الاتصال بخادم قاعدة البيانات. يرجى التحقق من اتصال الإنترنت الخاص بك أو المحاولة لاحقاً.', 
          en: 'Failed to connect to the database server. Please check your internet connection or try again later.' 
        });
      } else if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = JSON.stringify({ ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات أو إنشاء حساب جديد.', en: 'Invalid email or password. Please check your credentials or create a new account.' });
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        errorMessage = JSON.stringify({ ar: 'تم تجاوز عدد المحاولات المسموح به! يرجى الانتظار حوالي 60 ثانية قبل المحاولة مرة أخرى.', en: 'Too many requests! Please wait about 60 seconds before trying again.' });
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex font-sans text-white" dir="rtl">
      {/* Form Section */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md">
          <div className="text-center lg:text-right">
            <div className="flex flex-col items-center lg:items-start mb-8">
              <img 
                src="https://i.imgur.com/zpJPuWC.png" 
                alt="Al Moneer Opticals" 
                className="h-32 w-auto object-contain mb-4 drop-shadow-sm" 
                referrerPolicy="no-referrer" 
              />
              <div className="flex flex-col items-center lg:items-start">
                <h1 className="text-4xl font-black text-brand-cyan tracking-tighter uppercase leading-none text-glow-cyan">Al Moneer</h1>
                <span className="text-sm font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Opticals</span>
                <span className="text-2xl font-bold text-white/80 font-traditional mt-2" dir="rtl">المنير للبصريات</span>
              </div>
            </div>
            <h2 className="mt-2 text-5xl font-black text-brand-cyan leading-tight uppercase tracking-tight text-glow-cyan">
              <DualText ar={tAuth.welcome.ar} en={tAuth.welcome.en} arClass="text-[1.2em] font-traditional font-bold" enClass="text-[0.4em] opacity-50 block" />
            </h2>
            <div className="mt-4">
              <DualText ar={tAuth.subtitle.ar} en={tAuth.subtitle.en} arClass="text-[1.2em] font-traditional font-bold text-white/70" enClass="text-[0.5em] opacity-40 block" />
            </div>
          </div>

          <div className="mt-10">
            <div className="bg-brand-card py-8 px-6 shadow-2xl border border-brand-cyan/10 rounded-[2.5rem] sm:px-10">
              
              {message ? (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="text-base text-brand-cyan bg-brand-cyan/10 p-6 rounded-2xl border border-brand-cyan/20 flex flex-col items-center text-center gap-4 whitespace-pre-wrap shadow-sm">
                    <CheckCircle2 className="w-16 h-16 text-brand-cyan" />
                    <div className="font-bold text-lg leading-relaxed">
                      {(() => {
                        try {
                          const m = JSON.parse(message);
                          return <DualText ar={m.title.ar} en={m.title.en} />;
                        } catch (e) {
                          return message;
                        }
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsSignUp(false);
                      setMessage(null);
                      setPassword('');
                    }}
                    className="w-full flex justify-center py-4 px-4 border border-transparent rounded-2xl shadow-md text-xl font-bold text-brand-dark bg-brand-cyan hover:bg-brand-cyan/90 transition-all transform hover:-translate-y-0.5"
                  >
                    <DualText ar={tAuth.backToLogin.ar} en={tAuth.backToLogin.en} arClass="text-[1.2em] font-traditional font-bold" enClass="text-[0.6em] opacity-60 block" />
                  </button>
                </div>
              ) : (
                <>
                  {!isSupabaseConfigured && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div className="text-sm font-medium">
                        <DualText 
                          ar="تنبيه: إعدادات Supabase مفقودة. يرجى ضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في إعدادات المشروع." 
                          en="Warning: Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in project settings." 
                        />
                      </div>
                    </div>
                  )}
                  <form action="#" className="space-y-6" onSubmit={handleAuth}>
                    {isSignUp && (
                      <div>
                        <label className="block mb-2 mr-1">
                          <DualText ar={tAuth.fullName.ar} en={tAuth.fullName.en} arClass="text-[1.1em] font-traditional font-bold text-white/60" enClass="text-[0.6em] opacity-40 block" />
                        </label>
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          placeholder="John Doe"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="appearance-none block w-full px-5 py-4 border border-brand-cyan/10 rounded-2xl shadow-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base transition-all bg-brand-dark text-white"
                          dir="ltr"
                        />
                      </div>
                    )}

                    {isSignUp && (
                      <div>
                        <label className="block mb-2 mr-1">
                          <DualText ar={tAuth.whatsapp.ar} en={tAuth.whatsapp.en} arClass="text-[1.1em] font-traditional font-bold text-white/60" enClass="text-[0.6em] opacity-40 block" />
                        </label>
                        <input
                          id="whatsappNumber"
                          name="whatsappNumber"
                          type="tel"
                          autoComplete="tel"
                          placeholder="+1234567890"
                          value={whatsappNumber}
                          onChange={(e) => setWhatsappNumber(e.target.value)}
                          className="appearance-none block w-full px-5 py-4 border border-brand-cyan/10 rounded-2xl shadow-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base transition-all bg-brand-dark text-white"
                          dir="ltr"
                        />
                      </div>
                    )}

                      <div>
                        <label className="block mb-2 mr-1">
                          <DualText ar={tAuth.email.ar} en={tAuth.email.en} arClass="text-[1.1em] font-traditional font-bold text-white/60" enClass="text-[0.6em] opacity-40 block" />
                        </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="email@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-5 py-4 border border-brand-cyan/10 rounded-2xl shadow-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base transition-all bg-brand-dark text-white"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block mb-2 mr-1">
                    <DualText ar={tAuth.password.ar} en={tAuth.password.en} arClass="text-[1.1em] font-traditional font-bold text-white/60" enClass="text-[0.6em] opacity-40 block" />
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={isSignUp ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-5 py-4 border border-brand-cyan/10 rounded-2xl shadow-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base pr-12 transition-all bg-brand-dark text-white"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/40 hover:text-brand-cyan transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div>
                    <label className="block mb-2 mr-1">
                      <DualText ar={tAuth.confirmPassword.ar} en={tAuth.confirmPassword.en} arClass="text-[1.1em] font-traditional font-bold text-white/60" enClass="text-[0.6em] opacity-40 block" />
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="appearance-none block w-full px-5 py-4 border border-brand-cyan/10 rounded-2xl shadow-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base pr-12 transition-all bg-brand-dark text-white"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-base text-red-400 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 flex items-center gap-2">
                    {(() => {
                      try {
                        const e = JSON.parse(error);
                        return <DualText ar={e.ar} en={e.en} arClass="text-[1em] font-traditional font-bold" enClass="text-[0.7em] opacity-70 block" />;
                      } catch (err) {
                        return error;
                      }
                    })()}
                  </div>
                )}
                
                {isSignUp && (
                  <div className="text-sm text-amber-400 bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                      <div className="font-bold">
                        <DualText ar={tAuth.securityNoticeTitle.ar} en={tAuth.securityNoticeTitle.en} arClass="text-[1.1em] font-traditional font-bold" enClass="text-[0.7em] opacity-70 block" />
                      </div>
                      <div>
                        <DualText ar={tAuth.securityNoticeDesc.ar} en={tAuth.securityNoticeDesc.en} arClass="text-[1em] font-traditional" enClass="text-[0.7em] opacity-60 block" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-center mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:flex-1 flex justify-center py-5 px-4 border border-transparent rounded-full shadow-lg text-sm font-black text-brand-dark bg-brand-cyan hover:bg-brand-cyan/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cyan disabled:opacity-50 transition-all transform hover:-translate-y-0.5 uppercase tracking-widest glow-cyan"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <DualText 
                        ar={isSignUp ? tAuth.signUp.ar : tAuth.signIn.ar} 
                        en={isSignUp ? tAuth.signUp.en : tAuth.signIn.en} 
                        arClass="text-[1.2em] font-traditional font-bold" 
                        enClass="text-[0.7em] opacity-80 block"
                        direction="row"
                      />
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-8 text-center border-t border-brand-cyan/10 pt-6 flex flex-col gap-4">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setMessage(null);
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="text-sm font-black text-white/40 hover:text-brand-cyan transition-colors uppercase tracking-widest"
                >
                  <DualText 
                    ar={isSignUp ? tAuth.hasAccount.ar : tAuth.noAccount.ar} 
                    en={isSignUp ? tAuth.hasAccount.en : tAuth.noAccount.en} 
                    arClass="text-[1.1em] font-traditional font-bold" 
                    enClass="text-[0.7em] opacity-60 block"
                  />
                </button>
              </div>
            </>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Section */}
      <div className="hidden lg:block relative w-0 flex-1 bg-brand-dark">
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=1000"
          alt="Stylish person wearing glasses"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 p-12 text-white text-right">
          <div className="mb-4">
            <DualText ar={tAuth.heroTitle.ar} en={tAuth.heroTitle.en} arClass="text-[2.5em] font-traditional font-bold text-glow-cyan" enClass="text-[0.8em] opacity-60 block" />
          </div>
          <div>
            <DualText ar={tAuth.heroDesc.ar} en={tAuth.heroDesc.en} arClass="text-[1.2em] font-traditional" enClass="text-[0.6em] opacity-50 block" />
          </div>
        </div>
      </div>
    </div>
  );
}