export function Footer() {
  return (
    <footer className="bg-black w-full">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-row justify-between items-center sm:flex-nowrap flex-wrap gap-4">
          {/* Logo and Brand */}
          <div className="flex flex-row items-center gap-3">
            <img src="/pixel_pulse_white.png" alt="MemePulse" className="h-[28px] w-[23px] object-contain" />
            <span
              className="text-[14px] text-white cursor-pointer"
              style={{ fontFamily: '"Press Start 2P", cursive' }}
            >
              MemePulse
            </span>
          </div>

          {/* Social Links */}
          <div className="flex flex-row gap-4 items-center flex-wrap justify-center">
            <a
              href="https://x.com/memepulse"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/twitter.png" alt="Twitter" className="w-6 h-6" />
            </a>
            <a
              href="https://discord.gg/memepulse"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/discord.svg" alt="Discord" className="w-6 h-6" />
            </a>
            <a
              href="https://t.me/memepulse"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/telegram.svg" alt="Telegram" className="w-6 h-6" />
            </a>
            <a
              href="https://docs.memepulse.xyz/"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/gitbook.png" alt="GitBook" className="w-6 h-6" />
            </a>
            <a
              href="https://medium.com/@memepulse"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/medium.png" alt="Medium" className="w-6 h-6" />
            </a>
            <a
              href="https://github.com/meme-pulse"
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <img src="/github.svg" alt="Github" className="w-6 h-6" />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div
          className="text-[10px] text-zinc-500 text-center w-full mt-3"
          style={{ fontFamily: '"Press Start 2P", cursive' }}
        >
          © {new Date().getFullYear()} MemePulse. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
