import React, { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet-async";
import TubePage from "../../layouts/tubePage";


export default function retard() {
  const [scannedMap, setScannedMap] = useState(new Map());
  const [orders, setOrders] = useState([]);
  const getDelayClass = (createdAt) => {
    const diffHrs = Math.floor(
      (new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(createdAt).getTime()) / 36e5
    );
    return diffHrs >= 2 ? "bg-red-700 text-white" : "";
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/retardOrders`,{credentials: 'include'});
        const result = await response.json();

        if (result) {
          setOrders(result.data);
        } else {
          console.error('Invalid response structure:', result);
        }
      } catch (err) {
        console.error(err.message);
      } 
    };

    fetchOrders();
  }, []);

  return (
    <TubePage>
      <Helmet>
        <title>RM-ORDERING – Valider les Commandes</title>
      </Helmet>

      <div className="text-black bg-black/5 p-4 relative">
        <div className="absolute inset-0 bg-neutral-300 -z-10 bg-cover bg-center" />

        <div className="overflow-x-auto z-30 mt-6">
          <table className="min-w-full table-auto bg-white shadow-md rounded text-xs sm:text-base">
            <thead className="bg-gray-200">
              <tr>
                {["APN", "Quantity", "Serial Commande", "Date", "Status", "Retard", "Description", "Rack"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-nowrap">
              {orders.length > 0 ? (
                orders.map((order,key) => {
                  const delayClass = getDelayClass(order.created_at);
                  const delayHrs = Math.floor(
                    (new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(order.created_at).getTime()) / 36e5
                  );
                  const delayMins = new Date(
                    new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(order.created_at).getTime()
                  ).getUTCMinutes();
                  return (
                    <tr
                      key={`${order.apn}-${order.barcode}-${key}`}
                      className={delayClass}
                    >
                      <td className="px-4 py-2">{order.apn}</td>
                      <td className="px-4 py-2">{order.quantityCmd}</td>
                      <td className="px-4 py-2 text-nowrap">{order.barcode}</td>
                      <td className="px-4 py-2 text-nowrap">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2">{order.statut}</td>
                      <td className="px-4 py-2">
                        {delayHrs} h
                      </td>
                      <td className="px-4 py-2">{order.description}</td>
                      <td className="px-4 py-2">{order.rack}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={9}
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

