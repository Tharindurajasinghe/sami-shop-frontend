import React from 'react';

const LoadingOverlay = ({ message = 'Processing...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center gap-4 w-72">
        {/* Spinner */}
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>

        {/* Message */}
        <p className="text-lg font-semibold text-gray-700 text-center">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
