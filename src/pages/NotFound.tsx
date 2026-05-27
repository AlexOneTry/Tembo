import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-7xl font-semibold bg-gradient-to-r from-brand-300 to-accent-400 bg-clip-text text-transparent">
          404
        </div>
        <p className="text-soft mt-2">Страница не найдена</p>
        <Link to="/" className="btn-primary mt-6">
          На главную
        </Link>
      </div>
    </div>
  );
}
