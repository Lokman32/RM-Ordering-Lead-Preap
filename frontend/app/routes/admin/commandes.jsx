import { useState, useEffect } from 'react';
import AdminPage from '../../layouts/adminPage';

export default function CommandesManager() {
  const [commandes, setCommandes] = useState([]);
  const [editCommande, setEditCommande] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const statusOptions = [
    { value: 'en_attente', label: 'En attente' },
    { value: 'livred', label: 'Livrée' },
    { value: 'confirmed', label: 'Confirmée' },
    { value: 'cancelled', label: 'Annulée' },
  ];

  useEffect(() => {
    fetchCommandes(selectedDate);
  }, [selectedDate]);

  const fetchCommandes = async (date) => {
    try {
      setLoading(true);
      setMessage(null);
      let url = `${import.meta.env.VITE_API_URL}/api/admin/commands`;
      if (date) url += `?date=${date}`;

      const res = await fetch(url);
      const data = await res.json();
      setCommandes(data.data || []);
    } catch (error) {
      setMessage({ type: 'error', text: "Erreur lors du chargement des commandes." });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/commands/${editCommande._id}/lignes/${editCommande.apn}/status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: editCommande.status }),
        }
      );

      if (!res.ok) throw new Error("Erreur de mise à jour");

      setMessage({ type: 'success', text: 'Statut mis à jour avec succès.' });
      setEditCommande(null);
      fetchCommandes(selectedDate);
    } catch (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du statut.' });
    }
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const getDelayClass = (createdAt, status) => {
    const diffHrs = Math.floor((new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(createdAt).getTime()) / 36e5);

    if (status === "partiellement_livred") {
      return "bg-yellow-500 text-white hover:text-black";
    }
    if (diffHrs >= 2 && !['livred', 'confirmed', 'en_attente'].includes(status)) {
      return "bg-red-700 text-white hover:text-black";
    }

    return "";
  };

  const deleteLigneCommande = async (serial_cmd, apn) => {
    if (!serial_cmd || !apn) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/commande/${encodeURIComponent(serial_cmd)}/lignes/${encodeURIComponent(apn)}`,
        { method: 'DELETE' }
      );

      if (res.ok) {
        setCommandes(commandes.filter(d => d.serial_cmd !== serial_cmd || d.dpn !== apn));
      } else {
        console.error('Failed to delete ligne commande');
      }
    } catch (err) {
      console.error('Error deleting ligne commande:', err);
    }
  }


  return (
    <AdminPage>
      <div className="w-full mx-auto p-6 bg-black/30 min-h-screen">
        <h1 className="text-3xl text-white font-bold mb-6">Gestion des Commandes</h1>

        {/* Date Selector */}
        <div className="mb-4 flex items-center gap-4">
          <label className="text-white font-semibold">Date :</label>
          <input
            type="date"
            value={selectedDate || ''}
            onChange={handleDateChange}
            className="px-3 py-2 bg-gray-50 rounded border"
          />
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={() => fetchCommandes(selectedDate)}
          >
            Filtrer
          </button>
          <button
            className="bg-gray-500 text-white px-3 py-1 rounded"
            onClick={() => {
              setSelectedDate(null);
              fetchCommandes(null);
            }}
          >
            Afficher tout
          </button>
        </div>


        {/* Message Display */}
        {message && (
          <div
            className={`mb-4 px-4 py-2 rounded ${message.type === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
              }`}
          >
            {message.text}
          </div>
        )}

        {/* Loading Indicator */}
        {loading ? (
          <p className="text-white">Chargement en cours...</p>
        ) : (
          <div className="overflow-x-auto bg-gray-300 shadow rounded-lg mt-4">
            <table className="min-w-full text-sm text-gray-800">
              <thead className="bg-gray-100 text-left text-xs font-semibold uppercase text-gray-600">
                <tr>
                  <th className="px-4 py-3">Serial_cmd</th>
                  <th className="px-4 py-3">APN</th>
                  <th className="px-4 py-3">Command at</th>
                  <th className="px-4 py-3">Retard</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {commandes.map((commande) => {
                  const delayClass = getDelayClass(commande.commanded_at, commande.status);
                  const delayHrs = Math.floor(
                    (new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(commande.commanded_at).getTime()) / 36e5
                  );
                  const delayMins = new Date(
                    new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Casablanca" })) - new Date(commande.commanded_at).getTime()
                  ).getUTCMinutes();
                  return (
                    <tr
                      key={commande.id}
                      className={`hover:bg-gray-100 cursor-pointer ${delayClass}`}
                    >
                      <td className="px-4 py-3 pl-8">{commande.serial_cmd}</td>
                      <td className="px-4 py-3">
                        {(typeof commande.isScuib === 'undefined')?commande.apn:(commande.isScuib ? commande.apn : commande.dpn)}</td>
                      <td className="px-4 py-3">{commande.commanded_at}</td>
                      <td className="px-4 py-2 text-nowrap">
                        {delayHrs} h : {delayMins} min
                      </td>
                      <td className="px-4 py-3">{commande.status}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className='bg-red-500 px-4 py-2 rounded cursor-pointer'
                          onClick={() => {
                            deleteLigneCommande(commande.serial_cmd, commande.dpn)
                          }}
                        >Delete</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal for editing status */}
        {editCommande && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Changer le Statut</h2>
              <form onSubmit={handleStatusChange}>
                <div className="mb-3">
                  <label className="block text-sm font-semibold mb-1">Nouveau statut :</label>
                  <select
                    value={editCommande.status}
                    onChange={(e) =>
                      setEditCommande({ ...editCommande, status: e.target.value })
                    }
                    className="w-full border px-3 py-2 rounded"
                  >
                    {statusOptions.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    className="bg-gray-400 hover:bg-gray-500 px-4 py-2 rounded"
                    onClick={() => setEditCommande(null)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
