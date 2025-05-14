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

Chart.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

export default function HistoryDashboard() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  });
  const [chartData, setChartData] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [details, setDetails] = useState([]);

  // 1) Create a ref for the Bar chart
  const chartRef = useRef(null);

  // 2) Fetch summary when date changes
  useEffect(() => {
    if (!selectedDate) return;
    fetch(`${import.meta.env.VITE_API_URL}/api/history?selected_date=${selectedDate}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => setChartData(data || []))
      .catch(console.error);
  }, [selectedDate]);

  // 3) Fetch detail table for a shift
  const fetchDetails = useCallback((date, shift) => {
    fetch(`${import.meta.env.VITE_API_URL}/api/history/details?date=${date}&shift=${shift}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => setDetails(json.data || []))
      .catch(console.error);
  }, []);

  // 4) Build chart data
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

  // 5) Handle click via a Bar prop
  const handleClick = (event) => {
    if (!chartRef.current) return;

    // This returns an array of elements under the click
    const elements = getElementAtEvent(chartRef.current, event);
    if (!elements.length) return;

    // datasetIndex % 3 => 0=Morning,1=Afternoon,2=Night
    const shiftNames = ['Morning', 'Afternoon', 'Night'];
    const { datasetIndex } = elements[0];
    const shift = shiftNames[datasetIndex % 3];

    setSelectedShift(shift);
    fetchDetails(selectedDate, shift);
  };

  return (
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
        onClick={handleClick}      // ← use prop, not options.onClick
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
  );
}
