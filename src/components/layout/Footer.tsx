export default function Footer() {
  return (
    <footer className="py-8 px-4 border-t border-gray-800">
      <div className="max-w-6xl mx-auto text-center">
        <p className="text-gray-400">
          © {new Date().getFullYear()} BRICON Anatholy. All rights reserved.
        </p>
        <p className="text-gray-500 text-sm mt-2">
          Built with Next.js, Three.js & Tailwind CSS
        </p>
      </div>
    </footer>
  );
}
