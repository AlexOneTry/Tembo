import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const setOnboarded = useAuth((s) => s.setOnboarded);
  const toast = useToast();
  const [email, setEmail] = useState('demo@avitoboost.ai');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      setOnboarded(true);
      toast.success('Добро пожаловать', 'Открываем дашборд...');
      navigate('/app');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 relative overflow-hidden p-12 items-end">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 opacity-90" />
        <div className="absolute inset-0 bg-grid-dark opacity-20" style={{ backgroundSize: '40px 40px' }} />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-white"
        >
          <div className="text-sm uppercase tracking-widest opacity-80">AvitoBoost AI</div>
          <h1 className="text-4xl xl:text-5xl font-semibold mt-3 max-w-md leading-tight">
            «За месяц мы подняли CTR на 47% — просто по подсказкам сервиса»
          </h1>
          <div className="mt-6 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">М</div>
            <div>
              <div className="text-sm font-semibold">Мария, владелец агентства</div>
              <div className="text-xs opacity-80">Realty Group, Москва</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Link to="/" className="inline-flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-glow">
              A
            </div>
            <div className="font-semibold text-strong">AvitoBoost <span className="text-brand-300">AI</span></div>
          </Link>
          <h2 className="text-2xl font-semibold text-strong">Вход в аккаунт</h2>
          <p className="text-sm text-soft mt-2">Демо-доступ открыт — войдите с любыми данными.</p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Пароль"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="h-4 w-4" />}
            />
            <Button type="submit" loading={loading} className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Войти в дашборд
            </Button>
          </form>

          <div className="mt-6 text-sm text-soft text-center">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-brand-300 hover:underline">
              Зарегистрироваться
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
