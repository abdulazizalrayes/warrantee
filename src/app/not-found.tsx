import Link from "next/link";

// Root-level not-found catches /404 static generation in App Router.
// Without this, Next.js falls through to the Pages Router _error/_document
// mechanism which throws: "<Html> should not be imported outside of pages/_document"
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold text-[#1A1A2E] mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-2">Page Not Found</p>
        <p className="text-gray-400 mb-8">The page you are looking for does not exist or has been moved.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/en" className="px-6 py-3 bg-[#4169E1] text-white rounded-xl font-medium hover:bg-[#3457c9] transition-all">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
