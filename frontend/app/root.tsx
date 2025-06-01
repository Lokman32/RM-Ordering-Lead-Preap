import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { Toaster } from "react-hot-toast";

import type { Route } from "./+types/root";
import "./app.css";
// import { Helmet } from "react-helmet";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { useEffect, useState } from "react";
// const { HelmetProvider } = pkg;
import { jwtDecode } from "jwt-decode";
import { useToken } from "./hook/useToken";

export function HydrateFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-orange-100 to-gray-200">
      <div className="animate-pulse text-6xl sm:text-9xl font-extrabold text-gray-600 drop-shadow-lg">
        Loading<span className="animate-bounce inline-block">...</span>
      </div>
    </div>
  );
}

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [decoded, setDecoded] = useState<any>(null);
  const logout = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    }).then((res) => {
      if (res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    });
  };

  const token = useToken();
  useEffect(() => {
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setDecoded(decodedToken);
      } catch (error) {
        console.error("Invalid token:", error);
      }
    }
  }, [token]);

  return (
    <HelmetProvider>
      <Meta />
      <Links />
      <Helmet>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RM-ORDERING</title>
        <script
          defer
          src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"
        />
        <link rel="icon" type="image/png" href="/favicon-32x32.png" />
      </Helmet>
      <div className="relative text-gray-800 min-h-screen flex flex-col">
        <div
          style={{
            backgroundImage: "url('/aptiv2.JPG')",
            backgroundSize: "cover",
          }}
          className="absolute h-full w-full z-10 top-0"
        >
          <div className="absolute h-full w-full z-50 bg-black/50 backdrop-blur-xs top-0"></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen bg-white/10">
          <nav className="backdrop-blur-sm border-b shadow-md p-4 text-white bg-black">
            <div className="container mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="text-6xl max-sm:text-lg font-extrabold tracking-widest"
                >
                  <img src="/aptiv-logo.svg" />
                </Link>
              </div>

              <button
                onClick={() => setOpen(!open)}
                className="sm:hidden text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {open ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>

              <ul className="hidden sm:flex tracking-widest gap-6 text-base">
                <li>
                  <Link to="/tube/index">Tube</Link>
                </li>
                <li>
                  <Link to="/logistic/index">Logistic</Link>
                </li>
                {decoded?.role === "admin" && (
                  <li>
                    <Link to="/admin/dashboard">Admin</Link>
                  </li>
                )}
                <li
                  onClick={logout}
                  className=" text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Log out
                </li>
              </ul>
            </div>

            {open && (
              <div className="sm:hidden mt-2">
                <ul className="flex flex-col font-bold tracking-widest gap-2">
                  <li className="block text-2xl px-4 py-2">
                    <Link to="/tube/index">Tube</Link>
                  </li>
                  <li className="block text-2xl px-4 py-2">
                    <Link to="/logistic/index">Logistic</Link>
                  </li>
                  <li
                    className="text-2xl text-red-500 px-4 py-2 hover:text-red-700 cursor-pointer"
                    onClick={logout}
                  >
                    Log out
                  </li>
                </ul>
              </div>
            )}
          </nav>

          {/*  App  */}
          <main className="container mx-auto flex-grow px-4 py-8">
            {children}
          </main>
          <Toaster
            position="bottom-right"
            reverseOrder={false}
            toastOptions={{
              duration: 8000,
              style: {
                border: "1px solid #713200",
                width: "500px",
                padding: "30px",
                fontSize: "22px",
                color: "#ffffff",
              },
              success: {
                style: {
                  background: "green",
                },
              },
              error: {
                style: {
                  background: "red",
                },
              },
            }}
          />

          <footer className="bg-white/40 flex justify-between text-xs text-black py-4 border-t px-6 z-50">
            <div className="text-[#f84018]">
              {new Date().getFullYear()} Aptiv
            </div>
            <div>
              Developed by:{" "}
              <a
                href="https://github.com/Lokman32"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-700"
              >
                Louqmane Bamousse
              </a>
            </div>
          </footer>
        </div>
        <ScrollRestoration />
        <Scripts />
      </div>
    </HelmetProvider>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
