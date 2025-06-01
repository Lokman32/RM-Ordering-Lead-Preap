import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, getElementAtEvent } from 'react-chartjs-2';
import AdminPage from '../../layouts/adminPage';

Chart.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function HistoryDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [chartData, setChartData] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [details, setDetails] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [detailsRow, setDetailsRow] = useState(null); // for fetched data
  const [loadingDetails, setLoadingDetails] = useState(false);


  const chartRef = useRef(null);

  useEffect(() => {
    if (!selectedDate) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/history?selected_date=${selectedDate}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setChartData(data || []))
      .catch(console.error);
  }, [selectedDate]);

  const fetchDetails = useCallback((date, shift) => {
    fetch(`${import.meta.env.VITE_API_URL}/api/history/details?date=${date}&shift=${shift}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => setDetails(json.data || []))
      .catch(console.error);
  }, []);

  const summary = chartData[0] || { commandes: {}, validated: {} };
  const data = {
    labels: summary.date ? [summary.date] : [],
    datasets: [
      {
        label: 'Morning Cmd',
        data: [summary.commandes.Morning || 0],
        backgroundColor: '#006b6370'
      },
      {
        label: 'Afternoon Cmd',
        data: [summary.commandes.Afternoon || 0],
        backgroundColor: '#f7401870'
      },
      {
        label: 'Night Cmd',
        data: [summary.commandes.Night || 0],
        backgroundColor: '#38394270'
      }
      // validated to add later 🔴🔴🔴🔴🔴🔴🔴🔴
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      title: { display: true, text: `Stats ${selectedDate}` },
      legend: { display: false }
    },
    scales: {
      x: { title: { display: true, text: 'Shift' } },
      y: { beginAtZero: true, ticks: { stepSize: 1 } }
    }
  };

  const handleClick = (event) => {
    if (!chartRef.current) return;

    const elements = getElementAtEvent(chartRef.current, event);
    if (!elements.length) return;

    const shiftNames = ['Morning', 'Afternoon', 'Night'];
    const { datasetIndex } = elements[0];
    const shift = shiftNames[datasetIndex % 3];

    setSelectedShift(shift);
    fetchDetails(selectedDate, shift);
  };

  const handleRowClick = async (serial_cmd, apn) => {
    setLoadingDetails(true);
    setSelectedRow(serial_cmd);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/command-details?serial_cmd=${encodeURIComponent(serial_cmd)}&apn=${encodeURIComponent(apn)}`
      );
      const data = await res.json();

      if (data.success) {
        setDetailsRow(data.data);
      } else {
        setDetailsRow(null);
      }
    } catch (err) {
      console.log("Erreur lors du chargement.");
    } finally {
      setLoadingDetails(false);
    }
  };


  return (
    <AdminPage>
      <div className="p-6 bg-gray-400">
        <input
          type="date"
          value={selectedDate}
          onChange={e => {
            setSelectedDate(e.target.value);
            setSelectedShift(null);
            setDetails([]);
          }}
          className="mb-4 px-3 py-2 border rounded"
        />

        <Bar
          ref={chartRef}
          data={data}
          options={options}
          onClick={handleClick}
          height={100}
        />

        {selectedShift && (
          <>
            <h2 className="mt-6 text-xl font-semibold">
              Détails pour le shift{' '}
              <span
                className={
                  `px-2 py-1 rounded text-white ` +
                  (
                    selectedShift === 'Morning'
                      ? 'bg-[#006b6370]'
                      : selectedShift === 'Afternoon'
                        ? 'bg-[#f7401870]'
                        : 'bg-[#38394270]'
                  )
                }
              >
                {selectedShift}
              </span>{' '}
              du {new Date(selectedDate).toLocaleDateString()}
            </h2>
            <table className="mt-6 min-w-full bg-white shadow">
              <thead>
                <tr>
                  {['Commande', 'APN', 'Qté Cmd', 'Qté Liv', 'Date Cmd', 'Statut']
                    .map(h => <th key={h} className="px-4 py-2"> {h} </th>)}
                </tr>
              </thead>
              <tbody>
                {details.length ? details.map((d, i) => (
                  <tr key={i} className="border-b" onClick={() => handleRowClick(d.serial_cmd, d.apn)}>
                    <td className="px-4 py-2">{d.serial_cmd}</td>
                    <td className="px-4 py-2">{d.apn}</td>
                    <td className="px-4 py-2">{d.quantityCmd}</td>
                    <td className="px-4 py-2">{d.quantityLiv}</td>
                    <td className="px-4 py-2">
                      {new Date(d.commanded_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">{d.status}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-500">
                      Aucun détail
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
        {selectedRow && (
          <div className="fixed inset-0 z-50 bg-black/70 bg-opacity-50 flex items-center justify-center">
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSelectedRow(null)}
              aria-label="Close details modal"
            />
            <div className="bg-white  z-50 rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
              <button
                onClick={() => {
                  setSelectedRow(null);
                  setDetailsRow(null);
                }}
                className="absolute top-2 right-3 text-gray-600 text-2xl font-bold hover:text-black"
              >
                ×
              </button>

              {loadingDetails ? (
                <div className="text-center py-10">Chargement...</div>
              ) : detailsRow ? (
                <div className='overflow-y-auto flex flex-col items-center justify-center max-h-[70vh] min-h-[50vh]'>
                  <h3 className="text-xl font-semibold mb-4">
                    Commande : {detailsRow.serial_cmd}
                  </h3>
                  <table className="w-full border">
                    <tbody>
                      <tr>
                        <th className="text-left px-4 py-2">APN</th>
                        <td className="px-4 py-2">{detailsRow.apn}</td>
                      </tr>
                      <tr>
                        <th className="text-left px-4 py-2">Qté Commandée</th>
                        <td className="px-4 py-2">{detailsRow.quantityCmd}</td>
                      </tr>
                      <tr>
                        <th className="text-left px-4 py-2">Qté Livrée</th>
                        <td className="px-4 py-2">{detailsRow.quantityLiv}</td>
                      </tr>
                      <tr>
                        <th className="text-left px-4 py-2">Date Commande</th>
                        <td className="px-4 py-2">{new Date(detailsRow.commanded_at).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <th className="text-left px-4 py-2">Statut</th>
                        <td className="px-4 py-2">{detailsRow.status}</td>
                      </tr>
                      <tr>
                        <th className="text-left px-4 py-2 align-top">Séries Livrées</th>
                        <td className="px-4 py-2">
                          {Array.isArray(detailsRow.serial_ids) && detailsRow.serial_ids.length ? (
                            <table className="w-full border">
                              <thead>
                                <tr>
                                  <th className="px-2 py-1 border">Série</th>
                                  <th className="px-2 py-1 border">Statut</th>
                                  <th className="px-2 py-1 border">Date Livraison</th>
                                  <th className="px-2 py-1 border">Date Confirmation</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detailsRow.serial_ids.map((s, idx) => (
                                  <tr key={idx}>
                                    <td className="px-2 py-1 border">{s.serial}</td>
                                    <td className="px-2 py-1 border">{s.status}</td>
                                    <td className="px-2 py-1 text-center border">{s.delivered_at ? new Date(s.delivered_at).toLocaleString() : '-'}</td>
                                    <td className="px-2 py-1 text-center border">{s.confirmed_at ? new Date(s.delivered_at).toLocaleString() : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <span className="text-gray-500">Aucune série livrée</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-red-500">Détails non trouvés.</p>
              )}
            </div>
          </div>
        )}


      </div>
    </AdminPage>
  );
}
