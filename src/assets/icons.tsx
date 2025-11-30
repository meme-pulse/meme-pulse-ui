interface TriangleUpDownIconProps {
  className?: string;
}

export const TriangleUpDownIcon = ({ className }: TriangleUpDownIconProps) => {
  return (
    <svg width="18" height="19" viewBox="0 0 18 19" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8.95961 3.6L12.3196 8.08H5.59961L8.95961 3.6ZM8.95961 14.8L5.59961 10.32H12.3196L8.95961 14.8Z" fill="currentColor" />
    </svg>
  );
};

interface WalletIconProps {
  className?: string;
}

export const WalletIcon = ({ className }: WalletIconProps) => {
  return (
    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M16.4847 6.57161V4.07161C16.4847 3.8506 16.3969 3.63864 16.2406 3.48236C16.0843 3.32608 15.8724 3.23828 15.6514 3.23828H4.81803C4.37601 3.23828 3.95208 3.41388 3.63952 3.72644C3.32696 4.039 3.15137 4.46292 3.15137 4.90495C3.15137 5.34698 3.32696 5.7709 3.63952 6.08346C3.95208 6.39602 4.37601 6.57161 4.81803 6.57161H17.318C17.539 6.57161 17.751 6.65941 17.9073 6.81569C18.0636 6.97197 18.1514 7.18393 18.1514 7.40495V10.7383M18.1514 10.7383H15.6514C15.2093 10.7383 14.7854 10.9139 14.4729 11.2264C14.1603 11.539 13.9847 11.9629 13.9847 12.4049C13.9847 12.847 14.1603 13.2709 14.4729 13.5835C14.7854 13.896 15.2093 14.0716 15.6514 14.0716H18.1514C18.3724 14.0716 18.5843 13.9838 18.7406 13.8275C18.8969 13.6713 18.9847 13.4593 18.9847 13.2383V11.5716C18.9847 11.3506 18.8969 11.1386 18.7406 10.9824C18.5843 10.8261 18.3724 10.7383 18.1514 10.7383Z"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.15137 4.90503V16.5717C3.15137 17.0137 3.32696 17.4376 3.63952 17.7502C3.95208 18.0628 4.37601 18.2384 4.81803 18.2384H17.318C17.539 18.2384 17.751 18.1506 17.9073 17.9943C18.0636 17.838 18.1514 17.626 18.1514 17.405V14.0717"
        stroke="currentColor"
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
