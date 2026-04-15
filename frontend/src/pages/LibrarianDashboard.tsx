import { useState, useEffect } from 'react';
import api from '../api';
import type { Book, Branch } from '../types';
import toast from 'react-hot-toast';
import { 
  BookPlus, 
  Building, 
  PackagePlus, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

// Interfaces for the Analytics data
interface PopularBook {
  title: string;
  author: string;
  borrow_count: number;
  rank: number;
}

interface BranchInventory {
  branch: string;
  title: string;
  total: number;
  available: number;
}

export default function LibrarianDashboard() {
  const [activeTab, setActiveTab] = useState<'books' | 'branches' | 'inventory' | 'reports'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchTotals, setBranchTotals] = useState<{branch: string, total_stock: number}[]>([]);
  const [monthlyFineRevenue, setMonthlyFineRevenue] = useState<number>(0);
  const [totalFineRevenue, setTotalFineRevenue] = useState<number>(0);
  const [branchRevenue, setBranchRevenue] = useState<{branch: string, revenue: number}[]>([]);
  
  // Analytics State
  const [popularBooks, setPopularBooks] = useState<PopularBook[]>([]);
  const [inventoryReport, setInventoryReport] = useState<BranchInventory[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Form States
  const [bookForm, setBookForm] = useState({ title: '', author: '', category: '', description: '' });
  const [branchForm, setBranchForm] = useState({ location: '' });
  const [inventoryForm, setInventoryForm] = useState({ branch_id: '', book_id: '', total_copies: 1 });

  useEffect(() => {
    fetchBaseData();
  }, []);

  // Fetch reports only when the reports tab is active
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  const fetchBaseData = async () => {
    try {
      const [booksRes, branchesRes] = await Promise.all([
        api.get('/books'),
        api.get('/branches')
      ]);
      setBooks(booksRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      toast.error('Failed to load system data.');
    }
  };

  const fetchReports = async () => {
  setLoadingReports(true);
  try {
    const [popRes, invRes, totalRes, monthlyRes, totalFineRes, branchRevRes] = await Promise.all([
      api.get('/reports/popular-books'),
      api.get('/reports/branch-inventory'),
      api.get('/reports/total-books-per-branch'),
      api.get('/reports/monthly-fines'),
      api.get('/reports/total-fines'),
      api.get('/reports/branch-revenue')
    ]);
    setPopularBooks(popRes.data);
    setInventoryReport(invRes.data);
    setBranchTotals(totalRes.data);
    setMonthlyFineRevenue(monthlyRes.data.monthly_fine_revenue || 0);
    setTotalFineRevenue(totalFineRes.data.total_revenue || 0);
    setBranchRevenue(branchRevRes.data);
  } catch (error) {
    toast.error('Could not load analytics reports.');
  } finally {
    setLoadingReports(false);
  }
};

  // --- Handlers ---
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/books', bookForm);
      toast.success('Book added to global catalog & vectorized for Smart Search!');
      setBookForm({ title: '', author: '', category: '', description: '' });
      fetchBaseData();
    } catch (error) { toast.error('Failed to add book.'); }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/branches', branchForm);
      toast.success('New branch opened!');
      setBranchForm({ location: '' });
      fetchBaseData();
    } catch (error) { toast.error('Failed to add branch.'); }
  };

  const handleUpdateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/inventory', {
        branch_id: parseInt(inventoryForm.branch_id),
        book_id: parseInt(inventoryForm.book_id),
        total_copies: inventoryForm.total_copies
      });
      toast.success('Inventory updated successfully!');
      setInventoryForm({ branch_id: '', book_id: '', total_copies: 1 });
    } catch (error) { toast.error('Failed to update inventory.'); }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Management Portal</h1>
        <p className="text-gray-500">Manage catalog, branches, and view system analytics.</p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'books', label: 'Books', icon: BookPlus },
          { id: 'branches', label: 'Branches', icon: Building },
          { id: 'inventory', label: 'Inventory', icon: PackagePlus },
          { id: 'reports', label: 'Analytics', icon: BarChart3 },
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        
        {/* ADD BOOK TAB */}
        {activeTab === 'books' && (
          <form onSubmit={handleAddBook} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800">Add New Book to Catalog</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input type="text" required placeholder="Book Title" className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} />
              <input type="text" required placeholder="Author Name" className="p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={bookForm.author} onChange={e => setBookForm({...bookForm, author: e.target.value})} />
              <input type="text" required placeholder="Category (e.g. Science Fiction)" className="md:col-span-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={bookForm.category} onChange={e => setBookForm({...bookForm, category: e.target.value})} />
              <textarea rows={4} required placeholder="Description (Used for Semantic Smart Search)" className="md:col-span-2 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={bookForm.description} onChange={e => setBookForm({...bookForm, description: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">Register Book</button>
          </form>
        )}

        {/* MANAGE BRANCHES TAB */}
        {activeTab === 'branches' && (
          <form onSubmit={handleAddBranch} className="space-y-6 max-w-md">
            <h2 className="text-xl font-bold text-gray-800">Open New Branch</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Name</label>
              <input type="text" required placeholder="e.g. Main Street Branch" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={branchForm.location} onChange={e => setBranchForm({ location: e.target.value })} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">Add Branch</button>
          </form>
        )}

        {/* STOCK INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <form onSubmit={handleUpdateInventory} className="space-y-6 max-w-lg">
            <h2 className="text-xl font-bold text-gray-800">Allocate Stock</h2>
            <div className="space-y-4">
              <select required aria-label="Select branch" title="Select branch" className="w-full p-3 border rounded-lg bg-white" value={inventoryForm.branch_id} onChange={e => setInventoryForm({...inventoryForm, branch_id: e.target.value})}>
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.location}</option>)}
              </select>
              <select required aria-label="Select book" title="Select book" className="w-full p-3 border rounded-lg bg-white" value={inventoryForm.book_id} onChange={e => setInventoryForm({...inventoryForm, book_id: e.target.value})}>
                <option value="">Select Book</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
              <input type="number" min="1" required placeholder="Total Copies" className="w-full p-3 border rounded-lg" value={inventoryForm.total_copies} onChange={e => setInventoryForm({...inventoryForm, total_copies: parseInt(e.target.value)})} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">Update Branch Stock</button>
          </form>
        )}

        {/* ANALYTICS TAB (SQL WINDOW FUNCTIONS) */}
        {activeTab === 'reports' && (
          <div className="space-y-10">
            {loadingReports ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>
            ) : (
              <>
                {/* Popularity Ranking */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="text-blue-600 w-5 h-5" />
                    <h2 className="text-xl font-bold text-gray-800">Book Popularity (SQL Window Rank)</h2>
                  </div>
                  <div className="overflow-hidden border border-gray-100 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Borrows</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {popularBooks.map((item, index) => (
                          <tr key={index} className="hover:bg-blue-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">#{item.rank}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.title}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.borrow_count} times</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inventory Status */}
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle className="text-orange-500 w-5 h-5" />
                    <h2 className="text-xl font-bold text-gray-800">Branch Stock Alerts</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inventoryReport.map((item, index) => (
                      <div key={index} className={`p-4 rounded-xl border ${item.available === 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">{item.branch}</p>
                            <h4 className="font-bold text-gray-900">{item.title}</h4>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${item.available === 0 ? 'bg-red-200 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item.available} / {item.total} Available
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue Snapshot */}
                <div className="mt-10">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingUp className="text-blue-600 w-5 h-5" />
                    <h2 className="text-xl font-bold text-gray-800">Fine Revenue Insights</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl shadow-sm">
                      <p className="text-sm text-blue-500 uppercase tracking-widest">This Month's Fine Revenue</p>
                      <p className="mt-4 text-3xl font-bold text-blue-900">₹{monthlyFineRevenue.toLocaleString()}</p>
                      <p className="mt-2 text-sm text-gray-500">Collected from all users across all branches.</p>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-sm">
                      <p className="text-sm text-indigo-500 uppercase tracking-widest">Total Fine Revenue (All Branches)</p>
                      <p className="mt-4 text-3xl font-bold text-indigo-900">₹{totalFineRevenue.toLocaleString()}</p>
                      <p className="mt-2 text-sm text-gray-500">Total fine revenue from all branches, including overdue amounts not yet returned.</p>
                    </div>

                    <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm">
                      <p className="text-sm text-gray-500 uppercase tracking-widest">Branch Fine Revenue</p>
                      <div className="mt-4 space-y-3">
                        {branchRevenue.length === 0 ? (
                          <p className="text-sm text-gray-400">No fine revenue yet.</p>
                        ) : (
                          branchRevenue.map((item, index) => (
                            <div key={index} className="flex justify-between items-center gap-4 rounded-xl bg-gray-50 p-3">
                              <span className="font-semibold text-gray-700">{item.branch}</span>
                              <span className="text-sm font-bold text-gray-900">₹{item.revenue.toLocaleString()}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Books per Branch Section */}
                <div className="mt-10">
                  <div className="flex items-center space-x-2 mb-4">
                    <Building className="text-purple-600 w-5 h-5" />
                    <h2 className="text-xl font-bold text-gray-800">Global Branch Distribution</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branchTotals.map((item, index) => (
                      <div key={index} className="bg-purple-50 border border-purple-100 p-5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="text-purple-600 font-extrabold text-3xl mb-1">
                          {item.total_stock}
                        </span>
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                          Total Books
                        </span>
                        <h4 className="text-gray-900 font-bold mt-2">{item.branch}</h4>
                      </div>
                    ))}
                    
                    {branchTotals.length === 0 && (
                      <p className="text-gray-400 italic col-span-full">No inventory data available.</p>
                    )}
                  </div>
                </div>  
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}