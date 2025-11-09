import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import Link from "next/link";

export default function UserPage() {
  // Ambil token dari cookie
  const token = cookies().get("ioh_session")?.value;
  if (!token) redirect("/login");

  // Verifikasi JWT
  let sess;
  try {
    sess = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center px-6">
      {/* soft gradient bg */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(99,102,241,0.25),transparent),radial-gradient(60%_50%_at_90%_80%,rgba(236,72,153,0.25),transparent),radial-gradient(60%_50%_at_10%_80%,rgba(34,211,238,0.25),transparent)]" />

      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-center">
        <p className="uppercase tracking-[0.3em] text-white/70 text-sm">Welcome</p>
        <h1 className="mt-2 text-3xl md:text-4xl font-bold">
          Hello,{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-sky-300 to-fuchsia-300">
            {sess.username}
          </span>
        </h1>
        <p className="mt-2 text-white/70">
          Role: <span className="font-semibold">{sess.role}</span>
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <form action="/api/auth/logout" method="post">
            <button
              className="px-5 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition shadow"
              aria-label="Logout"
            >
              Logout
            </button>
          </form>
          <Link
            href="/"
            className="px-5 py-2 rounded-full border border-white/20 hover:bg-white/10 transition"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
