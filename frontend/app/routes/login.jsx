import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function Login() {
  const [matricule, setMatricule] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Échec de la connexion');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('matricule', JSON.stringify(data.data.matricule));

      if (data.data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/tube/index');
      }

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center -z-10" ></div>

      <div className="absolute pt-5 top-8 left-0 w-full flex justify-center">
        <h1 className="text-6xl pt-10 tracking-widest font-bold text-white uppercase drop-shadow-lg">RM Ordering of lead preap area</h1>
      </div>

      <div className="bg-white/80 backdrop-blur-md p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-700">Log In</h2>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
            Matricule incorrect
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="matricule" className="block mb-2 text-sm font-medium text-gray-700">Matricule</label>
            <input
              type="password"
              id="matricule"
              name="matricule"
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Connection
          </button>
        </form>
      </div>
    </div>
  );
}
