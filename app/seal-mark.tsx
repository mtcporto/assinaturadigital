export function SealMark({ size = 44 }: { size?: number }) {
 return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Símbolo Selo" xmlns="http://www.w3.org/2000/svg">
  <path d="M50 3 59 8 69 7 76 15 86 18 89 28 97 36 95 47 99 57 93 67 92 78 82 84 76 93 65 93 55 99 45 95 34 97 25 90 15 87 12 76 4 69 6 58 2 48 8 38 8 27 18 21 24 12 35 12Z" fill="#B77653"/>
  <circle cx="50" cy="50" r="36" fill="#8E4B35" stroke="#D9A987" strokeWidth="2"/>
  <circle cx="50" cy="50" r="29" fill="none" stroke="#D9A987" strokeWidth="1.5" opacity=".8"/>
  <path d="m33 51 12 12 23-27" fill="none" stroke="#FFF3E5" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
 </svg>;
}
