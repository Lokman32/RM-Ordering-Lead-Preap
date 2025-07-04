import React, { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import TubePage from "../../layouts/tubePage";
import toast from 'react-hot-toast';

export default function Confirm() {
  // const [popupOpen, setPopupOpen] = useState(false);
  // const [serialCmd, setSerialCmd] = useState("");
  const [currentAPN, setCurrentAPN] = useState("");
  const [orders, setOrders] = useState([]);
  const cmdRef = useRef(null);
  const apnRef = useRef(null);
  const serialRef = useRef(null);

  const getDelayClass = (createdAt) => {
    const diffHrs = Math.floor((new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(createdAt).getTime()) / 36e5);
    return diffHrs >= 2 ? "bg-red-700 text-white" : "";
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/deliverOrder`, {
        credentials: 'include'
      });
      const result = await response.json();
      setOrders(result.data || []);
    } catch (err) {
      console.error("Error fetching command lines:", err);
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchOrders()
    apnRef.current?.focus();
  }, []);

  // const openPopup = () => setPopupOpen(true);
  // const closePopup = () => setPopupOpen(false);

  // const handleCmdKey = (e) => {
  //   if (e.code === "Enter") {
  //     e.preventDefault();
  //     const serial = e.target.value.trim();
  //     setSerialCmd(serial);
  //     setPopupOpen(false);
  //     fetchOrders(serial);
  //     apnRef.current?.focus();
  //   }
  // };

  const handleAPNKey = (e) => {
    if (e.code === "Enter") {
      e.preventDefault();
      const v = e.target.value.trim();
      setCurrentAPN(
        v.toUpperCase().startsWith("1P")
          ? v.slice(2).toUpperCase()
          : v.toUpperCase()
      );
      serialRef.current?.focus();
    }
  };

  const handleSerialKey = (e) => {
    if (e.code !== "Enter") return;
    e.preventDefault();

    const serial_number = e.target.value.trim();
    let apn = currentAPN;

    e.target.value = "";
    apnRef.current.value = "";

    const serialRegex = /^x\d{10}$/i;
    if (!serialRegex.test(serial_number)) {
      toast.error("Produit non valide !");
      apnRef.current.focus();
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/deliver-products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ apn, serial_number }),
    })
      .then((r) => r.json())
      .then((data) => {
        apnRef.current.focus();
        if (data.success) {
          toast.success("Produit validé !");
          fetchOrders();
        } else {
          toast.error("Produit non valide !");
        }
      })
      .catch((err) => {
        console.error("Error during delivery:", err);
      });
  };


  return (
    <TubePage>
      <Helmet>
        <title>RM-ORDERING – Valider les Commandes</title>
      </Helmet>

      <div className="text-black bg-black/5 p-4 relative">
        <div className="absolute inset-0 bg-neutral-300 -z-10" />

        <div className="my-4 flex justify-between">
          <h1 className="text-xl font-semibold">Order list</h1>
        </div>


        <div className="flex flex-col items-center">
          <input
            ref={apnRef}
            type="text"
            placeholder="APN"
            onKeyDown={handleAPNKey}
            className="w-full border max-w-3xl py-3 my-2 px-6 text-center text-2xl rounded bg-white/30"
          />
          <input
            ref={serialRef}
            type="text"
            placeholder="Serial produit"
            onKeyDown={handleSerialKey}
            className="w-full border max-w-3xl py-3 my-2 px-6 text-center text-2xl rounded bg-white/30"
          />
        </div>

        <div className="overflow-x-auto z-30 mt-6">
          <table className="min-w-full table-auto bg-white shadow-md rounded text-sm sm:text-base">
            <thead className="bg-gray-200">
              <tr>
                {[
                  "APN",
                  "Quantity commanded",
                  "Quantity Livred",
                  "Ordered by",
                  "Serial Commande",
                  "Date",
                  "Status",
                  "Retard",
                  "Description",
                  "Rack",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length > 0 ? (
                orders.map((order, i) => {
                  const delayClass = getDelayClass(order.created_at);
                  const delayHrs = Math.floor(
                    (new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(order.created_at).getTime()) / 36e5
                  );
                  const delayMins = new Date(
                    new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(order.created_at).getTime()
                  ).getUTCMinutes();
                  const rowClass =
                    order.statut === "livred"
                      ? "bg-orange-300"
                      : order.statut === "confirmé"
                        ? "bg-green-300"
                        : order.statut === "partiellement_livred"
                          ? "bg-yellow-300"
                          : delayClass;

                  return (
                    <tr key={i} className={rowClass}>
                      <td className="px-4 py-2">{order.isScuib ? order.apn : order.dpn}</td>
                      <td className="px-4 py-2">{order.quantityCmd}</td>
                      <td className="px-4 py-2">{order.quantityLiv || ""}</td>
                      <td className="px-4 py-2">{order.command_by}</td>
                      <td className="px-4 py-2">{order.barcode}</td>
                      <td className="px-4 py-2">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{order.statut}</td>
                      <td className="px-4 py-2">
                        {delayHrs} h {delayMins} min
                      </td>
                      <td className="px-4 py-2">{order.description}</td>
                      <td className="px-4 py-2">{order.rack}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={10}
                    className="py-4 font-medium text-2xl text-center"
                  >
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
