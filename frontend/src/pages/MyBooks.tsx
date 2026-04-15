import { useState, useEffect } from 'react';
import api from '../api';
import type { Book, Transaction, Reservation, Branch } from '../types';
import toast from 'react-hot-toast';
import { BookCheck, Clock, MapPin, AlertCircle, BellRing, Calendar } from 'lucide-react';
import { History } from 'lucide-react';

export default function MyBooks() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [tx, res, bks, brs] = await Promise.all([
        api.get('/my-books'),
        api.get('/my-reservations'),
        api.get('/books'),
        api.get('/branches')
      ]);
      setTransactions(tx.data);
      setReservations(res.data);
      setBooks(bks.data);
      setBranches(brs.data);
    } catch (e) {
      toast.error("Failed to load your library data.");
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (bookId: number) => {
  try {
    const response = await api.post(`/return/${bookId}`);
    const data = response.data;

    // 1. Handle Fine logic in the Alert
    if (data.fine_incurred > 0) {
      toast(`Returned Late: ${data.days_late} days. Fine: ₹${data.fine_incurred.toFixed(2)}`, {
        icon: '⚠️',
        style: {
          borderRadius: '10px',
          background: '#FFF5F5',
          color: '#C53030',
          border: '1px solid #FEB2B2'
        },
      });
    } else {
      toast.success("Returned on time! Thank you.");
    }

    // 2. Handle the "Auto Allotted" notification
    // If this return triggered an allotment to someone else, 
    // it's good for the current user to know it helped the queue.
    if (data.auto_allotted) {
      console.log("Book was immediately assigned to the next person in queue.");
    }

    // 3. Refresh the UI data
    fetchData();
    
  } catch (error: any) {
    const errorMessage = error.response?.data?.detail || 'Failed to return book.';
    toast.error(errorMessage);
  }
};

  const getBook = (id: number) => books.find(b => b.id === id);
  const getBranch = (id: number) => branches.find(b => b.id === id);

  const activeBooks = transactions
    .filter(t => !t.return_date)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const returnedHistory = transactions
    .filter(t => t.return_date)
    .sort((a, b) => new Date(b.return_date!).getTime() - new Date(a.return_date!).getTime());

  // detect newly allotted books (last 24 hrs)
  const newAllotted = activeBooks.filter(
    t => new Date().getTime() - new Date(t.issue_date).getTime() < 86400000
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">My Library Activity</h1>

      {/* 🔔 ALERTS */}
      {newAllotted.length > 0 && (
        <div className="mb-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center mb-2">
            <BellRing className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="font-bold text-blue-800">New Books Allotted!</h3>
          </div>
          <p className="text-sm text-blue-700">
            Some books from your waitlist are now available and assigned to you.
          </p>
        </div>
      )}
      {activeBooks.some(tx => new Date(tx.due_date) < new Date()) && (
        <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg shadow-sm">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-bold text-red-700">Overdue Book Alert</h3>
          </div>
          <p className="text-sm text-red-700">
            One or more borrowed books are overdue and a fine is accumulating. Please return them soon to avoid additional charges.
          </p>
        </div>
      )}

      {/* 📚 CURRENTLY BORROWED */}
      <section className="mb-12">
        <h2 className="flex items-center text-xl font-bold text-gray-800 mb-4">
          <BookCheck className="mr-2 text-green-600"/> Currently Borrowed
        </h2>

        {activeBooks.length === 0 ? (
          <p className="text-gray-500 bg-white p-6 rounded-lg border">
            No active borrowed books.
          </p>
        ) : (
          <div className="space-y-4">
            {activeBooks.map(tx => {
              const book = getBook(tx.book_id);
              const branch = getBranch(tx.branch_id);
              const isOverdue = new Date(tx.due_date) < new Date();
              const overdueDays = isOverdue ? Math.ceil((new Date().getTime() - new Date(tx.due_date).getTime()) / 86400000) : 0;

              return (
                <div key={tx.id} className="bg-white p-5 rounded-lg border flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{book?.title}</h3>
                    <p className="text-sm text-gray-500">by {book?.author}</p>

                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1"/> {branch?.location}
                    </p>

                    <div className="flex items-center text-sm mt-2">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="mr-4">
                        Issued: {new Date(tx.issue_date).toLocaleDateString()}
                      </span>

                      <AlertCircle className={`w-4 h-4 mr-1 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        Due: {new Date(tx.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {tx.estimated_fine > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        Fine ₹{tx.estimated_fine.toFixed(0)} • {overdueDays} day{overdueDays === 1 ? '' : 's'} overdue
                      </span>
                    )}
                    <button
                      onClick={() => handleReturn(tx.book_id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                    >
                      Return
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ⏳ WAITLIST */}
      <section className="mb-12">
        <h2 className="flex items-center text-xl font-bold text-gray-800 mb-4">
          <Clock className="mr-2 text-orange-500"/> My Waitlist
        </h2>

        {reservations.length === 0 ? (
          <p className="text-gray-400 italic">No reservations.</p>
        ) : (
          <div className="space-y-3">
            {reservations.map(res => (
              <div key={res.id} className="bg-orange-50 p-4 rounded-xl border flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center font-bold text-orange-600 border">
                    #{res.rank}
                  </div>
                  <div>
                    <h4 className="font-bold">{getBook(res.book_id)?.title}</h4>
                    <p className="text-xs flex items-center">
                      <MapPin className="w-3 h-3 mr-1"/> {getBranch(res.branch_id)?.location}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-orange-500">WAITING</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 📖 HISTORY */}
      <section className="mt-12">
        <div className="flex items-center space-x-2 mb-4">
          <History className="w-5 h-5 text-gray-400" />
          <h2 className="text-xl font-bold text-gray-800">Reading History</h2>
        </div>

        {returnedHistory.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-gray-500 italic">No past returns yet. Start reading!</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {returnedHistory.map((tx) => {
                const book = getBook(tx.book_id);
                const hasFine = tx.fine > 0;

                return (
                  <li key={tx.id} className="p-5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col">
                      <p className="font-bold text-gray-900">{book?.title || "Unknown Book"}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span>Returned: {new Date(tx.return_date!).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      {hasFine ? (
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                            Fine: ₹{tx.fine.toFixed(2)}
                          </span>
                          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Late Return</p>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            Returned On Time
                          </span>
                          <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">Verified</p>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}