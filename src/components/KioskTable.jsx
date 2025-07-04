// src/components/KioskTable.jsx
export default function KioskTable({ kiosks, onToggleStatus, onDelete }) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyKioskUrl = async (kioskId) => {
    const kioskUrl = `${window.location.origin}/?kiosk=${kioskId}`;
    try {
      await navigator.clipboard.writeText(kioskUrl);
      // You could add a toast notification here
      alert('Kiosk URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = kioskUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Kiosk URL copied to clipboard!');
    }
  };

  const truncateId = (id) => {
    return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
  };

  if (kiosks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No kiosks found</h3>
        <p className="text-sm sm:text-base text-gray-600">Create your first kiosk to get started with employee time tracking.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Mobile Card View */}
      <div className="block sm:hidden space-y-4">
        {kiosks.map((kiosk) => (
          <div key={kiosk.id} className="bg-white border border-gray-300 rounded-lg shadow-md p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{kiosk.name}</h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs font-mono text-gray-600" title={kiosk.id}>
                    {truncateId(kiosk.id)}
                  </span>
                  <button
                    onClick={() => copyKioskUrl(kiosk.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy kiosk URL"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                kiosk.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {kiosk.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            {(kiosk.description || kiosk.location) && (
              <div className="mb-3 space-y-1">
                {kiosk.description && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Description:</span> {kiosk.description}
                  </p>
                )}
                {kiosk.location && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {kiosk.location}
                  </p>
                )}
              </div>
            )}
            
            <div className="text-xs text-gray-500 mb-3">
              Created: {formatDate(kiosk.created_at)}
            </div>
            
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  const kioskUrl = `${window.location.origin}/?kiosk=${kiosk.id}`;
                  window.open(kioskUrl, '_blank');
                }}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={!kiosk.is_active}
              >
                Open Kiosk
              </button>
              <div className="flex space-x-2">
                <button
                  onClick={() => onToggleStatus(kiosk.id, kiosk.is_active)}
                  className={`flex-1 px-3 py-2 rounded text-sm ${
                    kiosk.is_active
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {kiosk.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => onDelete(kiosk.id)}
                  className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block">
        <table className="w-full border border-gray-300 rounded-lg shadow-md bg-white">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Kiosk ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden lg:table-cell">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden lg:table-cell">Location</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 hidden md:table-cell">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {kiosks.map((kiosk) => (
              <tr key={kiosk.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{kiosk.name}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono text-gray-600" title={kiosk.id}>
                      {truncateId(kiosk.id)}
                    </span>
                    <button
                      onClick={() => copyKioskUrl(kiosk.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Copy kiosk URL"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    {kiosk.description || '-'}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="text-sm text-gray-600">{kiosk.location || '-'}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    kiosk.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {kiosk.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <div className="text-sm text-gray-600">
                    {formatDate(kiosk.created_at)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col lg:flex-row lg:space-x-2 space-y-1 lg:space-y-0">
                    <button
                      onClick={() => {
                        const kioskUrl = `${window.location.origin}/?kiosk=${kiosk.id}`;
                        window.open(kioskUrl, '_blank');
                      }}
                      className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs disabled:opacity-50"
                      disabled={!kiosk.is_active}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onToggleStatus(kiosk.id, kiosk.is_active)}
                      className={`px-2 py-1 rounded text-xs ${
                        kiosk.is_active
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {kiosk.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => onDelete(kiosk.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
