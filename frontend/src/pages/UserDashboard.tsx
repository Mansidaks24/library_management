import { useState, useEffect } from 'react';
import api from '../api';
import type { Book, Transaction } from '../types';
import BookCard from '../components/BookCard';
import SearchBar from '../components/SearchBar';
import toast from 'react-hot-toast';
import { Sparkles, Loader2 } from 'lucide-react';

export default function UserDashboard() {
  const [books, setBooks] = useState<Book[]>([]); // Full catalog
  const [borrowedBookIds, setBorrowedBookIds] = useState<number[]>([]);
  const [semanticResults, setSemanticResults] = useState<Book[]>([]); // API results
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSmartSearch, setIsSmartSearch] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // 1. Initial Load: Fetch all books
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const [booksResponse, myBooksResponse] = await Promise.all([
        api.get('/books'),
        api.get('/my-books'),
      ]);

      const activeBorrowings = (myBooksResponse.data as Transaction[]).filter(
        (transaction) => !transaction.return_date
      );

      setBooks(booksResponse.data);
      setBorrowedBookIds(activeBorrowings.map((transaction) => transaction.book_id));
    } catch (error) {
      toast.error('Failed to load the catalog.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Smart Search Logic: Triggers API call when typing stops
  useEffect(() => {
    if (isSmartSearch && searchQuery.trim() !== '') {
      setSearching(true);
      // Wait 500ms after the user stops typing before hitting the DB
      const delayDebounceFn = setTimeout(async () => {
        try {
          const response = await api.get(`/search/semantic?q=${encodeURIComponent(searchQuery)}`);
          setSemanticResults(response.data);
        } catch (error) {
          toast.error('Semantic search failed.');
        } finally {
          setSearching(false);
        }
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setSemanticResults([]);
      setSearching(false);
    }
  }, [searchQuery, isSmartSearch]);

  // 3. Handle Borrowing (Now includes Branch ID)
  const handleIssue = async (bookId: number, branchId: number) => {
    try {
      await api.post('/issue', { 
        book_id: bookId, 
        branch_id: branchId, 
        days_to_borrow: 14 
      });

      setBorrowedBookIds((current) =>
        current.includes(bookId) ? current : [...current, bookId]
      );
      toast.success('Book borrowed successfully!');
      await fetchBooks(); // Refresh to update availability counts
      return true;
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Could not borrow book.';
      toast.error(message);
      return false;
    }
  };  

  const handleReserve = async (bookId: number, branchId: number) => {
  try {
    const response = await api.post('/reserve', { 
      book_id: bookId, 
      branch_id: branchId,
      days_to_borrow: 14
    });
    
    // This provides the visual confirmation that it worked
    toast.success(`Joined waitlist! You are #${response.data.position} in line.`);
    
    // Optional: refresh data to show the update if you have a count on the card
    await fetchBooks();
    return true;
  } catch (error: any) {
    toast.error(error.response?.data?.detail || 'Could not join queue');
    return false;
  }
};

  // 4. Determine what to display on screen
  let displayedBooks: Book[] = [];
  if (isSmartSearch && searchQuery.trim() !== '') {
    displayedBooks = semanticResults;
  } else if (!isSmartSearch && searchQuery.trim() !== '') {
    // Standard Lexical Search (Filter locally)
    displayedBooks = books.filter(book => 
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  } else {
    // Default to showing all books if search is empty
    displayedBooks = books; 
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header & Search Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Library Catalog</h1>
          <p className="text-gray-500 mt-1">Find and borrow books across our branches.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="w-full sm:w-80">
            <SearchBar onSearch={setSearchQuery} />
          </div>

          {/* The Smart Search Toggle (Segmented Control) */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setIsSmartSearch(false)}
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                !isSmartSearch ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setIsSmartSearch(true)}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                isSmartSearch ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isSmartSearch ? 'text-blue-600' : ''}`} />
              <span>Smart</span>
            </button>
          </div>
        </div>
      </div>

      {/* Loading States & Grids */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>
      ) : searching ? (
        <div className="flex flex-col items-center justify-center py-20 text-blue-600 animate-pulse">
          <Sparkles className="w-8 h-8 mb-4" />
          <p className="font-medium">AI is searching meanings...</p>
        </div>
      ) : displayedBooks.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 text-lg">No books found. Try a different search term!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedBooks.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              onIssue={handleIssue} 
              isBorrowed={borrowedBookIds.includes(book.id)}
              onReserve={handleReserve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
