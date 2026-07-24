import React from 'react';

export default function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
      {Icon && <Icon size={36} className="opacity-30" />}
      <p className="font-medium text-gray-700">{title}</p>
      {message && <p className="text-sm text-center">{message}</p>}
    </div>
  );
}
