import React, { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import TubePage from "../../layouts/tubePage";
import { useNavigate } from "react-router";
import {jwtDecode} from "jwt-decode";

export default function index() {
  const inputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [command_by, setCmd] = useState("");
  const [keyCounter, setKeyCounter] = useState(0);
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
    // Token is expired
    localStorage.removeItem('token');
    navigate('/login');
  } else {
    setCmd(decoded.matricule);
    console.log(decoded)
  }
}, [navigate, command_by]);


  // autofocus input on load
  useEffect(() => {
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    document.addEventListener("click", focusInput);
    document.addEventListener("keydown", focusInput);
    return () => {
      document.removeEventListener("click", focusInput);
      document.removeEventListener("keydown", focusInput);
    };
  }, []);

  const handleEnter = async (e) => {
    if (e.code !== "Enter") return;
    e.preventDefault();

    let value = e.target.value.trim();
    e.target.value = "";
    if (value.toLowerCase().startsWith("1p")) {
      value = value.slice(2);
    }
    if (!value) return;

    if (rows.some((r) => r.dpn === value)) {
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/test-apn?value=${encodeURIComponent(value)}`, { credentials: 'include' });
      const data = await res.json();
      if (!data.exists) return;

      setRows((prev) => [
        ...prev,
        { dpn: value, quantity: null, id: keyCounter },
      ]);
      setKeyCounter((k) => k + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const setQuantity = (id, qty) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, quantity: qty } : r))
    );
  };

  const deleteRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleOrder = async () => {
    if (rows.length === 0) { return }
    const payload = rows.map(({ dpn, quantity }) => ({ dpn, qte: quantity }));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/commandes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command_by:command_by, payload }),
        credentials: 'include'
      });
      const json = await res.json();
      console.log("Server response:", command_by);
      setRows([]);
      setKeyCounter(0);
    } catch (err) {
      window.location.href = '/login';
    }
  };

  return (
    <TubePage>
      <Helmet>
        <title>RM-ORDERING – Tube Area</title>
      </Helmet>

      <div className="bg-black/5 px-5 pb-20 pt-10 rounded relative">
        <div className="absolute inset-0 bg-neutral-300 -z-10 bg-cover bg-center" />
        <h1 className="text-3xl px-2 py-6 text-center uppercase font-bold text-black/60">
          Create New Order
        </h1>

        <div className="space-y-4">
          <input
            ref={inputRef}
            onKeyDown={handleEnter}
            placeholder="Scanner barcode ici"
            className="w-full py-3 px-10 text-center text-4xl bg-white/50 placeholder-black"
          />
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto bg-white shadow rounded-lg mt-6">
            <table className="min-w-full text-sm text-gray-800">
              <thead className="bg-gray-400 text-left text-xs font-semibold uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">APN</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {rows.map(({ dpn, quantity, id }) => (
                  <tr key={id}>
                    <td className="px-4 py-3 text-3xl">{dpn}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {[...Array(8)].map((_, i) => {
                          const val = i + 1;
                          const selected = quantity === val;
                          return (
                            <button
                              key={val}
                              onClick={(e) => {
                                e.preventDefault();
                                setQuantity(id, val);
                              }}
                              className={`px-4 py-1 text-xl rounded hover:bg-gray-300 ${selected
                                  ? "border-2 border-indigo-500"
                                  : "bg-gray-200"
                                }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xl">
                      <button onClick={() => deleteRow(id)}>❌</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-center mt-5">
          <button
            onClick={handleOrder}
            className="bg-indigo-800 text-2xl uppercase text-amber-100 px-6 py-3 hover:text-blue-500 hover:bg-white hover:font-bold"
          >
            Order
          </button>
        </div>
      </div>
    </TubePage>
  );
}
