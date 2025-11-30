import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Drawer, DrawerTrigger, DrawerContent, DrawerClose } from '@/components/ui/drawer';
import { useAccount, useAccountEffect, useSwitchChain } from 'wagmi';
import { retroToast } from '@/components/ui/retro-toast';
import { DEFAULT_CHAINID } from '@/constants';

export function Header() {
  const navigate = useNavigate();
  const pathname = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const account = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    // Only switch chain if wallet is connected
    if (account.address && account.chainId && account.chainId !== DEFAULT_CHAINID) {
      switchChain(
        {
          chainId: DEFAULT_CHAINID,
        },
        {
          onSuccess: () => {
            console.log('switchChain success');
          },
          onError: (error) => {
            console.log('switchChain error', error);
          },
        }
      );
    }
  }, [account.address, account.chainId, switchChain]);

  useAccountEffect({
    onConnect(data) {
      retroToast.success('Successfully Connected!', {
        description: data.address,
      });
    },
    onDisconnect() {
      retroToast.warning('Disconnected!', {
        description: 'Please connect your wallet to continue',
      });
    },
  });

  const handleWheelClick = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const handleMouseDown = (event: React.MouseEvent, href: string) => {
    if (event.button === 1) {
      event.preventDefault();
      handleWheelClick(href);
    } else {
      navigate(href);
    }
  };

  return (
    <header className="bg-[#060208] sticky top-0 z-30 h-[62px] border-b border-[#060208]">
      <div className="max-w-screen-2xl mx-auto h-full">
        <div className="flex items-center justify-between h-full px-4 sm:px-6 lg:px-8">
          {/* Logo Section - Left */}
          <div className="flex items-center space-x-2">
            <img
              src="/pixel_pulse_white.png"
              alt="MemePulse"
              className="h-[45px] w-[37px] cursor-pointer object-contain"
              onClick={() => navigate('/')}
            />
            <span
              className="text-[20px] text-white cursor-pointer hidden sm:inline"
              style={{ fontFamily: '"Press Start 2P", cursive', lineHeight: '30px' }}
              onClick={() => navigate('/')}
            >
              MemePulse
            </span>
            {/* Hamburger menu for mobile */}
            <span className="sm:hidden ml-2">
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerTrigger asChild>
                  <button aria-label="Open menu">
                    <Menu className="w-6 h-6 text-white" />
                  </button>
                </DrawerTrigger>
                <DrawerContent className="fixed right-0 top-0 bottom-0 w-64 max-w-full bg-[#060208] shadow-lg z-50 flex flex-col p-6 m-0 rounded-none animate-slide-in-left">
                  <DrawerClose asChild>
                    <button className="self-end mb-4" aria-label="Close menu">
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </DrawerClose>
                  <nav className="flex flex-col space-y-4 mt-2">
                    <div
                      className={`text-lg cursor-pointer ${pathname.pathname === '/swap' ? 'text-[#cfbaff]' : 'text-white'}`}
                      style={{ fontFamily: '"Press Start 2P", cursive' }}
                      onClick={() => {
                        navigate('/swap');
                        setDrawerOpen(false);
                      }}
                    >
                      Trade
                    </div>
                    <div
                      className={`text-lg cursor-pointer ${pathname.pathname === '/pool' ? 'text-[#cfbaff]' : 'text-white'}`}
                      style={{ fontFamily: '"Press Start 2P", cursive' }}
                      onClick={() => {
                        navigate('/pool');
                        setDrawerOpen(false);
                      }}
                    >
                      Pool
                    </div>
                    <div
                      className={`text-lg cursor-pointer ${pathname.pathname === '/portfolio' ? 'text-[#cfbaff]' : 'text-white'}`}
                      style={{ fontFamily: '"Press Start 2P", cursive' }}
                      onClick={() => {
                        navigate('/portfolio');
                        setDrawerOpen(false);
                      }}
                    >
                      Portfolio
                    </div>
                  </nav>
                </DrawerContent>
              </Drawer>
            </span>
          </div>

          {/* Center Navigation */}
          <nav className="hidden sm:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            <span
              onClick={(e) => handleMouseDown(e, '/swap')}
              className={`text-[12px] cursor-pointer transition-colors ${
                pathname.pathname === '/swap' ? 'text-[#cfbaff]' : 'text-white hover:text-[#cfbaff]'
              }`}
              style={{ fontFamily: '"Press Start 2P", cursive', lineHeight: '16px' }}
            >
              Trade
            </span>
            <span
              onClick={(e) => handleMouseDown(e, '/pool')}
              className={`text-[12px] cursor-pointer transition-colors ${
                pathname.pathname === '/pool' ? 'text-[#cfbaff]' : 'text-white hover:text-[#cfbaff]'
              }`}
              style={{ fontFamily: '"Press Start 2P", cursive', lineHeight: '16px' }}
            >
              Pool
            </span>
          </nav>

          {/* Connect Wallet Button - Right */}
          <div className="flex items-center">
            <ConnectButton.Custom>
              {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <button
                    onClick={connected ? openAccountModal : openConnectModal}
                    type="button"
                    className="relative h-[42px] px-4 flex items-center justify-center"
                  >
                    {/* Yellow pixel-art button background */}
                    <div className="absolute inset-0 flex flex-col items-center">
                      {/* Shadow layer (darker yellow) */}
                      <div
                        className="absolute top-[6px] left-0 right-0 h-[36px] bg-yellow-600"
                        style={{
                          clipPath:
                            'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                        }}
                      />
                      {/* Main layer (bright yellow) */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[38px] bg-yellow-400"
                        style={{
                          clipPath:
                            'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                        }}
                      />
                    </div>
                    {/* Button text */}
                    <span
                      className="relative z-10 text-black font-bold text-[16px] tracking-[0.48px]"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        textShadow: '0px 2px 0px #eab308',
                      }}
                    >
                      {connected ? (
                        <span className="flex items-center">
                          <span className="truncate max-w-[120px]">
                            {account.address.slice(0, 6)}...{account.address.slice(-4)}
                          </span>
                        </span>
                      ) : (
                        'Connect Wallet'
                      )}
                    </span>
                  </button>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
}
