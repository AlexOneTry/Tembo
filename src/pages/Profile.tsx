import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut, Mail, Phone, Save, User as UserIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/store/auth';
import { useToast } from '@/components/ui/Toast';
import { formatDate } from '@/utils/format';

export function Profile() {
  const user = useAuth((s) => s.user);
  const update = useAuth((s) => s.updateProfile);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [company, setCompany] = useState(user?.company ?? '');

  function save() {
    update({ name, email, phone, company });
    toast.success('Профиль сохранён');
  }

  return (
    <div>
      <PageHeader title="Профиль" description="Личные данные и контакты" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-3xl font-semibold text-white shadow-glow">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <h3 className="text-lg font-semibold text-strong mt-4">{user?.name}</h3>
          <div className="text-sm text-soft">{user?.email}</div>
          <Badge tone="brand" className="mt-3">
            {user?.plan?.toUpperCase()} план
          </Badge>
          {user?.createdAt && (
            <div className="text-xs text-soft mt-4">
              С нами с {formatDate(user.createdAt)}
            </div>
          )}
          <Button
            className="mt-6 w-full"
            variant="secondary"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Выйти из аккаунта
          </Button>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Контактные данные" description="Видны только вам" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<UserIcon className="h-4 w-4" />}
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <Input
              label="Телефон"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="h-4 w-4" />}
              placeholder="+7 (___) ___-__-__"
            />
            <Input
              label="Компания"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              leftIcon={<Building2 className="h-4 w-4" />}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={save} leftIcon={<Save className="h-4 w-4" />}>
              Сохранить
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
