export default function BillingLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Current plan card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="flex items-end gap-2 mb-4">
          <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Usage stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
      {/* Invoice history */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 w-36 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="flex gap-3 items-center">
              <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
