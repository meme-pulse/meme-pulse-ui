import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Wallet, Layers, BarChart2, X } from 'lucide-react';
import { useState } from 'react';
import { useAccountModal, useConnectModal } from '@rainbow-me/rainbowkit';

export function BottomNav() {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { openAccountModal } = useAccountModal();
  const { openConnectModal } = useConnectModal();

  function isActive(path: string) {
    return pathname === path;
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-green-dark-950 border-t border-green-dark-800 flex justify-around items-center h-16 md:hidden">
        <button
          onClick={() => navigate('/swap')}
          className="flex flex-col items-center justify-center focus:outline-none bg-green-dark-950"
        >
          <BarChart2 className={`w-6 h-6 ${isActive('/swap') ? 'text-green-dark-400' : 'text-green-dark-300'}`} />
          <span className={`text-xs mt-1 ${isActive('/swap') ? 'text-green-dark-400' : 'text-green-dark-300'}`}>Trade</span>
        </button>
        <button
          onClick={() => navigate('/pool')}
          className="flex flex-col items-center justify-center focus:outline-none bg-green-dark-950"
        >
          <Layers className={`w-6 h-6 ${isActive('/pool') ? 'text-green-dark-400' : 'text-green-dark-300'}`} />
          <span className={`text-xs mt-1 ${isActive('/pool') ? 'text-green-dark-400' : 'text-green-dark-300'}`}>Pool</span>
        </button>

        <button
          onClick={openAccountModal || openConnectModal}
          className="flex flex-col items-center justify-center focus:outline-none bg-green-dark-950"
        >
          <Wallet className="w-6 h-6 text-green-dark-300" />
          <span className="text-xs mt-1 text-green-dark-300">Wallet</span>
        </button>
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col items-center justify-center focus:outline-none bg-green-dark-950"
        >
          <Menu className="w-6 h-6 text-green-dark-300" />
          <span className="text-xs mt-1 text-green-dark-300">Menu</span>
        </button>
      </nav>
      {/* Drawer Overlay & Panel */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <aside className="fixed right-0 top-0 bottom-0 w-64 max-w-full bg-green-dark-900 shadow-lg z-50 flex flex-col p-6 animate-slide-in-left">
            <button className="self-end mb-4" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <X className="w-6 h-6 text-green-dark-100" />
            </button>
            <nav className="flex flex-col space-y-4">
              <div className="text-green-dark-200 hover:text-green-dark-400 text-lg font-medium cursor-pointer">Farms</div>
              <div className="text-green-dark-200 hover:text-green-dark-400 text-lg font-medium cursor-pointer">Stake</div>
              <div className="text-green-dark-200 hover:text-green-dark-400 text-lg font-medium cursor-pointer">Vote</div>
              <div className="text-green-dark-200 hover:text-green-dark-400 text-lg font-medium cursor-pointer">Joe</div>
            </nav>
          </aside>
        </>
      )}
    </>
  );
}
