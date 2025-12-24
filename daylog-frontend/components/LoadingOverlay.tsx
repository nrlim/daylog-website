'use client';

import { useLoadingStore } from '@/lib/store';

export default function LoadingOverlay() {
  const isLoading = useLoadingStore((state) => state.isLoading);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/95 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        </div>
        <p className="text-gray-700 font-semibold text-lg">Loading...</p>
        <p className="text-gray-500 text-sm mt-2">Please wait while we process your request</p>
      </div>
    </div>
  );
}
