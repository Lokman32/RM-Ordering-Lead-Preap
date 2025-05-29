import { useState, useEffect } from 'react';
import AdminPage from '../../layouts/adminPage';

export default function RackManager() {
  const [products, setProducts] = useState([]);
  const [racks, setRacks] = useState([]);
  const [search, setSearch] = useState('');
  const [editProduct, setEditProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
    generateRacks();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tubes`);
    const data = await res.json();
    setProducts(data.data);
  };

  const generateRacks = () => {
    const racks = [];
    for (let i = 1; i <= 12; i++) {
      racks.push(`F${String(i).padStart(2, '0')}`);
    }
    const numbers = ['01', '02', '03'];
    const letters = ['A', 'B', 'C'];
    numbers.forEach((number) => {
      letters.forEach((letter) => {
        for (let suffix = 1; suffix <= 5; suffix++) {
          racks.push(`R${number}-${letter}${String(suffix).padStart(2, '0')}`);
        }
      });
    });

    setRacks(racks);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/search-rack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apn: search }),
    });
    const data = await res.json();
    setProducts(data.data);
  };

  const handleDelete = async (id) => {
    if (confirm(`supprimer le produit ${id}`)) await fetch(`${import.meta.env.VITE_API_URL}/api/products/${id}`, { method: 'DELETE' });
    fetchProducts();
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await fetch(`${import.meta.env.VITE_API_URL}/api/rack`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProduct),
    });
    setEditProduct(null);
    fetchProducts();
  };

  return (
    <AdminPage>
      <div className="w-full mx-auto p-6 bg-black/30">
        <h1 className="text-3xl text-white font-bold mb-6">Gestion des Produits</h1>

        <form onSubmit={handleSearch} className="space-y-4 p-6 bg-gray-400/80 rounded-md shadow-md">
          <label className="block mb-2 text-gray-700 font-bold uppercase text-sm">Search</label>
          <div className="flex">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border-2 border-black p-2 rounded-md w-full uppercase"
            />
            <button type="submit" className="ml-2 p-2 px-6 bg-blue-300 rounded">Search</button>
          </div>
        </form>

        <div className="overflow-x-auto bg-gray-300 shadow rounded-lg mt-4">
          <table className="min-w-full text-sm text-gray-800">
            <thead className="bg-gray-100 text-left text-xs font-semibold uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">APN</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Packaging</th>
                <th className="px-4 py-3">Unity</th>
                <th className="px-4 py-3">Rack</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-gray-100 cursor-pointer"
                  onClick={() => setEditProduct(product)}>
                  <td className="px-4 py-3 font-medium">{product.dpn}</td>
                  <td className="px-4 py-3">{product.type}</td>
                  <td className="px-4 py-3">{product.packaging}</td>
                  <td className="px-4 py-3">{product.unity}</td>
                  <td className="px-4 py-3">{product.rack}</td>
                  <td className="px-4 py-3">
                    <button className="text-red-600 hover:underline" onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(product.dpn);
                    }}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editProduct && (
          <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Update Product</h2>
              <form onSubmit={handleUpdate}>
                {['dpn', 'type', 'packaging', 'unity'].map(field => (
                  <div key={field} className="mb-3">
                    <label className="block text-sm font-semibold capitalize">{field}</label>
                    <input
                      type="text"
                      className="w-full border px-3 py-2 rounded"
                      value={editProduct[field]}
                      onChange={e => setEditProduct({ ...editProduct, [field]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="mb-3">
                  <label className="block text-sm font-semibold">Rack</label>
                  <select
                    value={editProduct.rack}
                    onChange={e => setEditProduct({ ...editProduct, rack: e.target.value })}
                    className="w-full border px-3 py-2 rounded"
                  >
                    {racks.map(rack => (
                      <option key={rack} value={rack}>{rack}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" className="bg-gray-400 px-4 py-2 rounded" onClick={() => setEditProduct(null)}>Back</button>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminPage>
  );
}
