import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";

export default function index() {
  const [orders, setOrders] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalValue, setModalValue] = useState("");
  const [modalOrder, setModalOrder] = useState(null);

  const openEditModal = (order) => {
    setModalOrder(order);
    setModalValue(order.description || "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalOrder(null);
    setModalValue("");
  };

  const handleModalSave = async () => {
    if (!modalOrder) return;
    if (modalValue === modalOrder.description) {
      closeModal();
      return;
    }
    await fetch(`${import.meta.env.VITE_API_URL}/api/description/${modalOrder.apn}/${modalOrder.barcode}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ description: modalValue }),
      credentials: 'include'
    });
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.apn === modalOrder.apn && order.barcode === modalOrder.barcode
          ? { ...order, description: modalValue, date_feedback:new Date() }
          : order
      )
    );
    closeModal();
  };

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/logistic`, { credentials: 'include' });
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

  const tableRef = useRef(null);

  const exportExcel = () => {
    const ws = XLSX.utils.table_to_sheet(tableRef.current);

    const columnWidths = [
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 20 },
      { wch: 20 },
      { wch: 10 },
      { wch: 10 },
      { wch: 25 },
      { wch: 10 },
    ];
    ws['!cols'] = columnWidths;

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        fill: {
          fgColor: { rgb: "FFFF00" },
        },
      };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, "orders.xlsx");
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    const table = tableRef.current;

    const headers = Array.from(table.querySelectorAll("thead th"))
      .map(th => th.textContent);

    const bodyText = [];
    const barcodeImgs = [];

    Array.from(table.querySelectorAll("tbody tr")).forEach((row, rowIndex) => {
      const cells = Array.from(row.querySelectorAll("td"));
      const textRow = [];
      let barcodeImg = null;

      cells.forEach((cell, colIndex) => {
        const txt = cell.textContent;
        if (colIndex === 3) {
          // generate barcode image once
          const canvas = document.createElement("canvas");
          JsBarcode(canvas, txt, { format: "CODE128" });
          barcodeImg = canvas.toDataURL("image/png");
          textRow.push('');        // placeholder, will be replaced by image
        } else {
          textRow.push(txt);
        }
      });

      bodyText.push(textRow);
      barcodeImgs.push(barcodeImg);
    });

    autoTable(doc, {
      head: [headers],
      body: bodyText,
      didDrawCell: (data) => {
        // Only body, only column 3 (zero-based)
        if (data.section === 'body' && data.column.index === 3) {
          const img = barcodeImgs[data.row.index];
          if (img) {
            doc.addImage(
              img, 'PNG',
              data.cell.x + 2,
              data.cell.y + 2,
              data.cell.width - 4,
              data.cell.height - 4
            );
          }
        }
      },
    });

    doc.save("orders.pdf");
  };

  const getDelayClass = (createdAt) => {
    const diffHrs = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / 36e5
    );
    return diffHrs >= 2 ? "bg-red-700 text-white" : "";
  };

  return (
    <>
      <Helmet>
        <title>RM-ORDERING – Consulter les Commandes</title>
      </Helmet>

      <div className="text-black relative p-5">
        <div className="absolute inset-0 bg-neutral-300 -z-10 bg-cover bg-center" />

        <div className="flex justify-between mb-5">
          <h1 className="text-xl font-semibold flex items-center">Order list</h1>
          <div className="mt-4 flex gap-4">
            <button
              id="exportExcel"
              onClick={exportExcel}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Exporter en Excel
            </button>
            <button
              id="exportPdf"
              onClick={exportPdf}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Exporter en PDF
            </button>
          </div>
        </div>

        <div className="overflow-x-auto z-30">
          <table
            ref={tableRef}
            id="ordersTable"
            className="min-w-full table-auto bg-white shadow-md rounded text-sm sm:text-base cursor-default"
          >
            <thead className="bg-gray-200">
              <tr>
                {[
                  "APN",
                  "Qte",
                  "Mlle",
                  "Serial_Comd",
                  "Date_Cmd",
                  "Retard",
                  "Feedback",
                  "Date_Feedback",
                  "Rack",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-nowrap">
              {orders.length > 0 ? (
                orders.map((order, key) => {
                  const delayClass = getDelayClass(order.created_at);
                  const delayHrs = Math.floor(
                    (Date.now() - new Date(order.created_at).getTime()) / 36e5
                  );
                  const delayMins = new Date(
                    Date.now() - new Date(order.created_at).getTime()
                  ).getUTCMinutes();
                  return (
                    <tr
                      key={`${order.apn}-${order.barcode}-${key}`}
                      className={delayClass}
                      onClick={() => openEditModal(order)}
                    >
                      <td className="px-4 py-2">{order.apn}</td>
                      <td className="px-4 py-2">{order.quantityCmd - order.quantityLiv}</td>
                      <td className="px-4 py-2">{order.command_by}</td>
                      <td className="px-4 py-2">{order.barcode}</td>
                      <td className="px-4 py-2 text-nowrap">
                        {new Date(order.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="px-4 py-2 text-nowrap">
                        {delayHrs} h : {delayMins} min
                      </td>
                      <td className="px-4 py-2">{order.description}</td>
                      <td className="px-4 py-2">{new Date(order.date_feedback).toLocaleString('fr-FR')}</td>
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-6 min-w-[320px]">
            <h2 className="text-lg font-semibold mb-4">Modifier la description</h2>
            <input
              type="text"
              className="border px-3 py-2 w-full mb-4"
              value={modalValue}
              onChange={e => setModalValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  handleModalSave();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={closeModal}
              >
                Annuler
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={handleModalSave}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function editDescription(tubeId, commandeId, currentDescription) {
  const newDescription = prompt("Edit the description:", currentDescription);
  if (newDescription === null || newDescription === currentDescription) return;

  fetch(`${import.meta.env.VITE_API_URL}/api/description/${tubeId}/${commandeId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description: newDescription }),
    credentials: 'include'
  })
    .then((r) => {
      if (r.ok) window.location.reload();
      else alert("Failed to update the description.");
    })
    .catch(() =>
      alert("An error occurred while updating the description.")
    );
}

