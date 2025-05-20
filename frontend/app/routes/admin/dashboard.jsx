import React, { useState, useEffect, useRef, useCallback } from 'react';
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
        backgroundColor: '#3b82f670'
      },
      {
        label: 'Afternoon Cmd',
        data: [summary.commandes.Afternoon || 0],
        backgroundColor: '#3b82f670'
      },
      {
        label: 'Night Cmd',
        data: [summary.commandes.Night || 0],
        backgroundColor: '#3b82f670'
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
          <table className="mt-6 min-w-full bg-white shadow">
            <thead>
              <tr>
                {['Commande', 'APN', 'Qté Cmd', 'Qté Liv', 'Date Cmd', 'Statut']
                  .map(h => <th key={h} className="px-4 py-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {details.length ? details.map((d, i) => (
                <tr key={i} className="border-b">
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
        )}
      </div>
    </AdminPage>
  );
}
