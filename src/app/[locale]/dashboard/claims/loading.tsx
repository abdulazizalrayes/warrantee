export default function ClaimsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      {/* Status filter pills */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        ))}
      </div>
      {/* Claims table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex gap-4">
          <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-4 w-1/5 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
