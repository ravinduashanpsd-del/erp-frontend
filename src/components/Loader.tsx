import React from 'react';

// Props for Loader component
interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'white' | 'blue';
  fullScreen?: boolean;
}

// Loader component
const Loader: React.FC<LoaderProps> = ({
  size = 'medium',
  color = 'white',
  fullScreen = false,
}) => {
  const sizeClasses: Record<'small' | 'medium' | 'large', string> = {
    small: 'w-6 h-6',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };
 
  // Loader spinner UI
  const loader = (
    <div
      className={`${sizeClasses[size]} border-4 ${color === 'white' ? 'border-white' : 'border-blue-500'
        } border-t-transparent rounded-full animate-spin`}
    />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        {loader}
      </div>
    );
  }

  return loader;
};

export default Loader;
