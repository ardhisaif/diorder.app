import React from "react";

interface LoadingStateProps {
  type?: "menu" | "cart" | "merchant";
}

const LoadingState: React.FC<LoadingStateProps> = ({ type = "menu" }) => {
  if (type === "menu") {
    return (
      <div className="animate-pulse space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow"
          >
            <div className="w-24 h-24 bg-gray-200 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "cart") {
    return (
      <div className="animate-pulse space-y-4 p-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-20 h-8 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "merchant") {
    return (
      <div className="animate-pulse space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default LoadingState;
