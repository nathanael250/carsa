import { useEffect, useState } from 'react';
import api from '../services/api';

type OilCategory = 'engine_oil' | 'gearbox_oil' | 'transmission_oil' | 'other';

interface OilProduct {
  id: number;
  name: string;
  brand: string;
  grade: string | null;
  category: OilCategory;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_OPTIONS: Array<{ value: OilCategory; label: string }> = [
  { value: 'engine_oil', label: 'Engine oil' },
  { value: 'gearbox_oil', label: 'Gearbox oil' },
  { value: 'transmission_oil', label: 'Transmission oil' },
  { value: 'other', label: 'Other' },
];

const getCategoryLabel = (category: OilCategory) =>
  CATEGORY_OPTIONS.find((option) => option.value === category)?.label || category;

const OilProducts = () => {
  const [oilProducts, setOilProducts] = useState<OilProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOil, setEditingOil] = useState<OilProduct | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    grade: '',
    category: 'engine_oil' as OilCategory,
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchOilProducts();
  }, [filterCategory]);

  const fetchOilProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getOilProducts({
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setOilProducts(response.data.oils || []);
      }
    } catch (err) {
      setError('Failed to fetch oil products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      grade: '',
      category: 'engine_oil',
      description: '',
      is_active: true,
    });
  };

  const handleOpenModal = (oil?: OilProduct) => {
    if (oil) {
      setEditingOil(oil);
      setFormData({
        name: oil.name,
        brand: oil.brand,
        grade: oil.grade || '',
        category: oil.category,
        description: oil.description || '',
        is_active: oil.is_active,
      });
    } else {
      setEditingOil(null);
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingOil(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: formData.name.trim(),
      brand: formData.brand.trim(),
      grade: formData.grade.trim() || undefined,
      category: formData.category,
      description: formData.description.trim() || undefined,
      is_active: formData.is_active,
    };

    try {
      const response = editingOil
        ? await api.updateOilProduct(editingOil.id, payload)
        : await api.createOilProduct(payload);

      if (response.error) {
        setError(response.error);
      } else {
        handleCloseModal();
        fetchOilProducts();
      }
    } catch (err) {
      setError('Failed to save oil product');
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await api.deleteOilProduct(id);
      if (response.error) {
        setError(response.error);
      } else {
        setDeleteConfirm(null);
        fetchOilProducts();
      }
    } catch (err) {
      setError('Failed to delete oil product');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oil Products</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure the oil options workers can select during oil-change services
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Oil Product
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filterCategory === 'all'
              ? 'bg-[#2F4858] text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilterCategory(option.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filterCategory === option.value
                ? 'bg-[#2F4858] text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FEA14C]"></div>
        </div>
      ) : oilProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-sm font-medium text-gray-900">No oil products</h3>
          <p className="mt-1 text-sm text-gray-500">Create the first oil product for workers to use.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {oilProducts.map((oil) => (
                  <tr key={oil.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{oil.brand}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{oil.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{oil.grade || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        {getCategoryLabel(oil.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        oil.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {oil.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(oil)}
                          className="text-[#FEA14C] hover:text-[#FE8A21] transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(oil.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingOil ? 'Edit Oil Product' : 'Create Oil Product'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="e.g., Total"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="e.g., Quartz 9000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                    placeholder="e.g., 5W-30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as OilCategory })}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#FEA14C]"
                  placeholder="Optional description"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-[#FEA14C] focus:ring-[#FEA14C]"
                />
                Active and available to workers
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-[#FEA14C] to-[#FE8A21] text-white rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  {editingOil ? 'Update Oil Product' : 'Create Oil Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Oil Product</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this oil product? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OilProducts;
