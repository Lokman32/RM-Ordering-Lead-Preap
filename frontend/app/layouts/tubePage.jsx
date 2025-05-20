import { jwtDecode } from 'jwt-decode';
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

export default function TubePage({ children }) {
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
    } else {
      children = React.cloneElement(children, { matricule: decoded.matricule });
    }
  }, [navigate]);

  return (
    <>
      <div
        className="bg-gray-900 text-white px-6 flex justify-center items-end gap-8 text-lg font-medium uppercase max-sm:flex-col max-sm:items-center">
        <Link
          to="/tube/index"
          className={`p-3 hover:text-amber-400 ${location.pathname === '/tube/index' ? 'bg-amber-400 text-black hover:text-black' : ''}`}>
          New Order
        </Link>
        <Link
          to="/tube/deliver"
          className={`p-3 hover:text-amber-400 ${location.pathname === '/tube/deliver' ? 'bg-amber-400 text-black hover:text-black' : ''}`}>
          Deliver order
        </Link>
        <Link
          to="/tube/validate"
          className={`p-3 hover:text-amber-400 ${location.pathname === '/tube/validate' ? 'bg-amber-400 text-black hover:text-black' : ''}`}>
          Confirm order
        </Link>
        <Link
          to="/tube/retard"
          className={`p-3 hover:text-amber-400 ${location.pathname === '/tube/retard' ? 'bg-amber-400 text-black hover:text-black' : ''}`}>
          Retard
        </Link>
      </div>
      {/* <Outlet /> */}
      {children}
    </>
  );
}
