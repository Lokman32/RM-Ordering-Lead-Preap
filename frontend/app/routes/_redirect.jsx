// routes/_redirect.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export default function Redirect() {
  const navigate = useNavigate();
  
  if (typeof window !== 'undefined') {
    navigate('/login');
  }
  return null;
}