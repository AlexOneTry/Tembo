import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Register() {
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Пароль слишком короткий', 'Минимум 6 символов');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      toast.success('Аккаунт создан', 'Перейдём к настройке проекта');
      navigate('/onboarding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="absolute inset-0 -z-10 bg-grid-dark opacity-20" style={{ backgroundSize: '40px 40px' }} />
      <div className="w-full max-w-sm">
        <Link to="/" className="inline-flex items-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-glow">
            A
          </div>
          <div className="font-semibold text-strong">AvitoBoost <span className="text-brand-300">AI</span></div>
        </Link>
        <h2 className="text-2xl font-semibold text-strong">Создать аккаунт</h2>
        <p className="text-sm text-soft mt-2">Бесплатно — 14 дней Pro в подарок.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            label="Имя"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            leftIcon={<User className="h-4 w-4" />}
            placeholder="Алексей"
          />
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4" />}
            placeholder="you@example.com"
          />
          <Input
            label="Пароль"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            hint="Минимум 6 символов"
          />
          <Button type="submit" loading={loading} className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Создать аккаунт
          </Button>
        </form>

        <div className="mt-6 text-sm text-soft text-center">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-brand-300 hover:underline">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
