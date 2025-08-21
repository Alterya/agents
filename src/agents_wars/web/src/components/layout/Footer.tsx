export default function Footer(): JSX.Element {
  return (
    <footer className="mt-12 border-t border-slate-800/80 bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-400">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Agent Wars. Built with Next.js. Accessibility-first.
          </p>
          <nav aria-label="Footer" className="flex gap-3">
            <a
              className="hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              href="/"
            >
              Home
            </a>
            <a
              className="hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              href="/hub"
            >
              Hub
            </a>
            <a
              className="hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              href="/scale"
            >
              Scale
            </a>
            <a
              className="hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              href="/promptbro"
            >
              PromptBro
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}


