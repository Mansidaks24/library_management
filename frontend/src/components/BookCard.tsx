import { useState } from 'react';
import type { Book } from '../types';
import api from '../api';
import { BookOpen, MapPin, Loader2, Clock, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Availability {
  branch_id: number;
  location: string;
  available: number;
}

export default function BookCard({ 
  book, 
  onIssue, 
  onReserve,
  isBorrowed,
}: { 
  book: Book, 
  onIssue: (bookId: number, branchId: number) => Promise<boolean>,
  onReserve: (bookId: number, branchId: number) => Promise<boolean>,
  isBorrowed: boolean,
}) {
  const [showAvailability, setShowAvailability] = useState(false);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingBranch, setProcessingBranch] = useState<number | null>(null);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/books/${book.id}/availability`);
      setAvailability(res.data);
      setShowAvailability(true);
    } catch (err) {
      toast.error("Could not load availability");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:border-blue-200 transition-all">
      <div className="flex-grow">
        <div className="flex items-start space-x-3 mb-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{book.title}</h3>
            <p className="text-gray-500 text-sm">by {book.author}</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{book.description}</p>
      </div>

      {!showAvailability ? (
        <button 
          onClick={fetchAvailability}
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg flex items-center justify-center space-x-2 font-semibold hover:bg-blue-700 transition-colors"
        >
          {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <span>Check Availability</span>}
        </button>
      ) : (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Select Branch</p>
          
          {availability.length === 0 ? (
            <p className="text-sm text-red-500 italic p-2 bg-red-50 rounded">Not stocked in any branch.</p>
          ) : (
            availability.map((loc) => (
              <div
                key={loc.branch_id}
                className={`w-full flex justify-between items-center p-3 rounded-xl border text-sm transition-all group ${
                  processingBranch === loc.branch_id ? 'opacity-70' : ''
                } ${
                  loc.available > 0 
                    ? 'border-blue-100 bg-blue-50 text-blue-700' 
                    : 'border-orange-100 bg-orange-50 text-orange-700'
                }`}
              >
                <div className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-2 opacity-60" />
                  <span className="font-medium">{loc.location}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {loc.available > 0 ? (
                    <span className="flex items-center font-bold">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                      {loc.available} Available
                    </span>
                  ) : (
                    <span className="flex items-center font-bold">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Join Queue
                    </span>
                  )}

                  {loc.available > 0 ? (
                    <button
                      disabled={processingBranch !== null || isBorrowed}
                      onClick={async () => {
                        setProcessingBranch(loc.branch_id);
                        try {
                          await onIssue(book.id, loc.branch_id);
                        } finally {
                          setProcessingBranch(null);
                        }
                      }}
                      className={`min-w-24 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        isBorrowed
                          ? 'cursor-not-allowed bg-green-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } ${processingBranch === loc.branch_id ? 'opacity-70' : ''}`}
                    >
                      {processingBranch === loc.branch_id ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </span>
                      ) : isBorrowed ? (
                        'Borrowed'
                      ) : (
                        'Borrow'
                      )}
                    </button>
                  ) : (
                    <button
                      disabled={processingBranch !== null}
                      onClick={async () => {
                        setProcessingBranch(loc.branch_id);
                        try {
                          await onReserve(book.id, loc.branch_id);
                        } finally {
                          setProcessingBranch(null);
                        }
                      }}
                      className={`min-w-24 rounded-lg px-3 py-2 text-xs font-semibold transition-colors bg-orange-600 text-white hover:bg-orange-700 ${
                        processingBranch === loc.branch_id ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      {processingBranch === loc.branch_id ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </span>
                      ) : (
                        'Reserve'
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          
          <button 
            onClick={() => setShowAvailability(false)}
            className="w-full py-1 text-xs text-gray-400 hover:text-gray-600 hover:underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
