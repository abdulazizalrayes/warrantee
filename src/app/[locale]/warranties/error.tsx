"use client";
import { useEffect } from "react";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">Something went wrong</h2>
        <p className="text-gray-500 mb-4">An error occurred loading warranties.</p>
        <button onClick={reset} className="px-4 py-2 bg-[#4169E1] text-white rounded-lg hover:bg-[#3457c9]">Try Again</button>
      </div>
    </div>
  );
}
