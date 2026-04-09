import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 mb-6 rounded-full bg-yellow-100 flex items-center justify-center">
        <svg className="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.072M12 12h.01" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">You are offline</h1>
      <p className="text-gray-500 mb-6 max-w-sm">
        No internet connection. Your previously viewed data is still available from the local cache.
      </p>
      <Link
        href="/vendor/dashboard"
        className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
