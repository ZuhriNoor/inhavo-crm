import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="flex-1 h-full w-full flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <span className="spinner w-8 h-8 border-indigo-600 border-t-transparent rounded-full animate-spin border-4" />
        <p className="text-sm text-gray-500 font-medium animate-pulse">Loading data...</p>
      </div>
    </div>
  );
}
