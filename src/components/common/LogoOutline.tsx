import React from 'react';

interface LogoOutlineProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  variant?: 'mark' | 'full';
}

export function LogoOutline({
  className = 'w-5 h-5 text-sauge',
  variant = 'mark',
  ...props
}: LogoOutlineProps) {
  if (variant === 'full') {
    return (
      <svg
        viewBox="0 0 160 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Paysage Concept"
        {...props}
      >
        {/* Dynamic swoosh */}
        <path
          d="M130 12C95 8 35 15 18 30C8 39 12 50 30 52C45 52 58 48 68 44"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Forward-slanted Paysage text */}
        <text
          x="38"
          y="35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontStyle="italic"
          fontSize="24"
          letterSpacing="-0.5"
        >
          Paysage
        </text>
        {/* Script Concept text */}
        <text
          x="46"
          y="50"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          fontFamily="cursive, Georgia, serif"
          fontWeight="600"
          fontStyle="italic"
          fontSize="15"
          letterSpacing="0.2"
        >
          Concept
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Paysage Concept"
      {...props}
    >
      {/* Signature dynamic swoosh of Paysage Concept */}
      <path
        d="M26 6C18 3.5 7.5 7.5 4.5 14.5C2 21 6 27.5 13.5 28.5C17.5 28.5 21 27 24 24"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Forward-slanted P (Paysage) */}
      <path
        d="M10.8 23L13.8 9.5H19.2C22 9.5 23.8 11 23.1 13.8C22.4 16.5 20.2 17.8 17.5 17.8H12.8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Script flourish / C (Concept) */}
      <path
        d="M23.5 20C21.2 22.4 18 23.6 14.5 23.6C12.2 23.6 11 22.2 11.6 19.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

