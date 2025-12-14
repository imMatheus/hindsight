import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <p className="text-xl text-neutral-400 mb-8">Page not found</p>
        <Link
          to="/"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}

