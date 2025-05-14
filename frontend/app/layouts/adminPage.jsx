import { jwtDecode } from 'jwt-decode';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

export default function AdminPage({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      localStorage.removeItem('token');
      navigate('/login');
    } else if(decoded.role !== 'admin'){
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);
  return (
    <>
      <div
        className="bg-gray-900 text-white px-6 flex justify-center items-end gap-8 text-lg font-medium uppercase max-sm:flex-col max-sm:items-center">
        <Link
          to="/admin/rack"
          className={`p-3 uppercase hover:text-amber-400 ${location.pathname === '/admin/rack' ? 'bg-amber-400 text-black hover:text-black' : ''}`}>
          rack
        </Link>
        <Link
          to="/admin/dashboard"
          className={`p-3 uppercase hover:text-amber-400 ${location.pathname === '/admin/dashboard' ? 'bg-amber-400 text-black hover:text-black' : ''}`}>
          dashboard
        </Link>
      </div>
      {children}
    </>
  );
}
