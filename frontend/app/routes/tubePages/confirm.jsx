import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import TubePage from "../../layouts/tubePage";
import toast from 'react-hot-toast';


export default function Confirm() {
  const [orders, setOrders] = useState([]);
  const [currentAPN, setCurrentAPN] = useState("");
  const apnRef = useRef(null);
  const serialRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/confirmDelivry`, {
        credentials: "include",
      });
      const result = await response.json();
      setOrders(result.data || []);
    } catch (err) {
      console.error("Invalid response structure:", err);
    }
  };

  useEffect(() => {
    fetchOrders();
    apnRef.current?.focus();
  }, []);

  const handleAPNKey = (e) => {
    if (e.code === "Enter") {
      e.preventDefault();
      const v = e.target.value.trim().toUpperCase();
      setCurrentAPN(v.startsWith("1P") ? v.slice(2) : v);
      serialRef.current?.focus();
    }
  };

  const handleSerialKey = (e) => {
    if (e.code !== "Enter") return;
    e.preventDefault();

    const serial = e.target.value.trim();

    e.target.value = "";
    apnRef.current.value = "";
    setCurrentAPN("");
    apnRef.current.focus();

    if (!currentAPN || !serial) {
      alert("Tous les champs doit être scannés.");
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/validate-products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ apn: currentAPN, serial_number: serial }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success === false) {
          toast.error(data.message)
          return;
        }
        toast.success("Product validated !");
        fetchOrders();
      })
    // .catch(() => alert("Erreur de connexion"));
  };


  return (
    <TubePage>
      <Helmet>
        <title>RM-ORDERING – Valider les Commandes</title>
      </Helmet>

      <div className="p-4 bg-black/5 text-black relative">
        <div className="flex flex-col items-center">
          <input
            ref={apnRef}
            placeholder="APN"
            onKeyDown={handleAPNKey}
            className="max-w-3xl w-full py-3 my-2 px-6 text-2xl text-center border rounded bg-white/30"
          />
          <input
            ref={serialRef}
            placeholder="Serial produit"
            onKeyDown={handleSerialKey}
            className="max-w-3xl w-full py-3 my-2 px-6 text-2xl text-center border rounded bg-white/30"
          />
        </div>

        <div className="overflow-x-auto mt-6">
          <table className="min-w-full bg-white shadow rounded text-sm">
            <thead className="bg-gray-200">
              <tr>
                {["APN", "Serial product", "Delivered at", "Serial Cmd", "Rack"].map(
                  (h) => (
                    <th key={h} className="px-4 py-2 text-left">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((o, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2">{o.isScuib ? o.apn : o.dpn}</td>
                    <td className="px-4 py-2">{o.serial}</td>
                    <td className="px-4 py-2">
                      {new Date(o.delivered_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{o.serial_cmd}</td>
                    <td className="px-4 py-2">{o.rack}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center">
                    Aucune commande
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </TubePage>
  );
}
