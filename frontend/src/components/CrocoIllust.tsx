interface CrocoIllustProps {
  size?: number
  className?: string
  color?: string
}

export default function CrocoIllust({ size = 80, className, color = '#3DDC97' }: CrocoIllustProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Croco"
    >
      {/* body */}
      <path
        d="M22 74c0-19 17-34 38-34s38 15 38 34c0 9-5 15-12 15H34c-7 0-12-6-12-15Z"
        fill={color}
        stroke="#0A0A0A"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* snout */}
      <path
        d="M40 80c0-8 9-14 20-14s20 6 20 14c0 4-3 7-7 7H47c-4 0-7-3-7-7Z"
        fill="#fff"
        stroke="#0A0A0A"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* teeth */}
      <path
        d="M47 87l3-5 3 5 3-5 3 5 3-5 3 5 3-5 3 5 3-5 3 5"
        fill="none"
        stroke="#0A0A0A"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* nostrils */}
      <circle cx="55" cy="72" r="2.2" fill="#0A0A0A" />
      <circle cx="65" cy="72" r="2.2" fill="#0A0A0A" />
      {/* eye bumps */}
      <circle cx="46" cy="48" r="11" fill={color} stroke="#0A0A0A" strokeWidth="4" />
      <circle cx="74" cy="48" r="11" fill={color} stroke="#0A0A0A" strokeWidth="4" />
      {/* pupils */}
      <circle cx="46" cy="49" r="4" fill="#0A0A0A" />
      <circle cx="74" cy="49" r="4" fill="#0A0A0A" />
    </svg>
  )
}
