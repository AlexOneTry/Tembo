import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Sparkles, Target } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import { useToast } from '@/components/ui/Toast';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const STEPS = [
  { icon: Briefcase, title: 'Расскажите о бизнесе', text: 'Подберём шаблоны и категории под вашу нишу' },
  { icon: Target, title: 'Выберите цель', text: 'Будем оптимизировать под главную метрику' },
  { icon: Sparkles, title: 'Готово', text: 'Загрузим демо-данные и покажем дашборд' },
];

export function Onboarding() {
  const navigate = useNavigate();
  const setOnboarded = useAuth((s) => s.setOnboarded);
  const addProject = useData((s) => s.addProject);
  const initialize = useData((s) => s.initialize);
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [projectName, setProjectName] = useState('Мой первый проект');
  const [category, setCategory] = useState('Недвижимость');
  const [goal, setGoal] = useState('Увеличить CTR');

  function next() {
    if (step === 0 && !projectName.trim()) {
      toast.error('Укажите название проекта');
      return;
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    addProject({ name: projectName.trim(), category, description: goal });
    initialize();
    setOnboarded(true);
    toast.success('Готово!', 'Открываем дашборд');
    navigate('/app');
  }

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex-1 flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition ${
                  i <= step
                    ? 'bg-brand-500 text-white shadow-glow'
                    : 'bg-white/10 text-soft'
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-brand-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>

        <motion.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-8"
        >
          <div className="h-12 w-12 rounded-xl bg-brand-500/15 text-brand-300 flex items-center justify-center mb-4">
            <StepIcon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-semibold text-strong">{STEPS[step].title}</h2>
          <p className="text-sm text-soft mt-1.5">{STEPS[step].text}</p>

          <div className="mt-6 space-y-4">
            {step === 0 && (
              <>
                <Input
                  label="Название проекта"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Например: Недвижимость Москва"
                />
                <Select label="Категория" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option>Недвижимость</option>
                  <option>Авто</option>
                  <option>Электроника</option>
                  <option>Услуги</option>
                  <option>Работа</option>
                  <option>Одежда</option>
                  <option>Хобби</option>
                </Select>
              </>
            )}
            {step === 1 && (
              <Select label="Главная цель" value={goal} onChange={(e) => setGoal(e.target.value)}>
                <option>Увеличить CTR</option>
                <option>Снизить стоимость заявки</option>
                <option>Поднять количество контактов</option>
                <option>Тестировать заголовки и фото</option>
              </Select>
            )}
            {step === 2 && (
              <div className="surface p-4 text-sm text-soft">
                Готово! Мы создадим демо-проекты с 30 днями статистики, чтобы вы сразу
                увидели, как работает аналитика.
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Назад
            </Button>
            <Button onClick={next} rightIcon={<ArrowRight className="h-4 w-4" />}>
              {step === STEPS.length - 1 ? 'Запустить' : 'Далее'}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
