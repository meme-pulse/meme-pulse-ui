import type { Theme } from '@rainbow-me/rainbowkit';

/**
 * Windows 95 style theme for RainbowKit
 * Matches the retro MemePulse aesthetic
 * Only modifies colors, fonts, and visual styling (radii, shadows)
 * Preserves original padding, margin, and width
 */
export const win95Theme: Partial<Theme> = {
  colors: {
    accentColor: '#808088', // Gray color
    accentColorForeground: '#121213',
    actionButtonBorder: '#808088',
    actionButtonBorderMobile: '#808088',
    actionButtonSecondaryBackground: '#dbdae0',
    closeButton: '#121213',
    closeButtonBackground: '#dbdae0',
    connectButtonBackground: '#dbdae0',
    connectButtonBackgroundError: '#ff0000',
    connectButtonInnerBackground: '#dbdae0',
    connectButtonText: '#121213',
    connectButtonTextError: '#ffffff',
    connectionIndicator: '#00ff00',
    downloadBottomCardBackground: '#dbdae0',
    downloadTopCardBackground: '#dbdae0',
    error: '#ff0000',
    generalBorder: '#808088',
    generalBorderDim: '#f9f9fa',
    menuItemBackground: '#dbdae0',
    modalBackdrop: 'rgba(0, 0, 0, 0.5)',
    modalBackground: '#dbdae0',
    modalBorder: '#ffffff',
    modalText: '#121213',
    modalTextDim: '#3d3d43',
    modalTextSecondary: '#3d3d43',
    profileAction: '#dbdae0',
    profileActionHover: '#c0c0c0',
    profileForeground: '#dbdae0',
    selectedOptionBorder: '#808088',
    standby: '#808088',
  },
  fonts: {
    body: 'Tahoma, Arial, sans-serif',
  },
  radii: {
    actionButton: '0px',
    connectButton: '0px',
    menuButton: '0px',
    modal: '0px',
    modalMobile: '0px',
  },
  shadows: {
    connectButton: 'inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa',
    dialog: '2px 2px 0px 0px #000',
    profileDetailsAction: 'inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa',
    selectedOption: 'inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa',
    selectedWallet: 'inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa',
    walletLogo: 'none',
  },
};
