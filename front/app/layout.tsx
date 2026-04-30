import type { Metadata, Viewport } from 'next'
import { Noto_Sans_KR, Black_Han_Sans, DM_Serif_Display, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const notoSansKR = Noto_Sans_KR({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
})

const blackHanSans = Black_Han_Sans({ 
  subsets: ['latin'],
  weight: '400',
  variable: '--font-display',
})

const dmSerifDisplay = DM_Serif_Display({ 
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
})

const geistMono = Geist_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: '두쫀쿠가고 버터떡왔다 | 질환 아동 안심 과자 추천',
  description: '소아 질환(알레르기, 아토피, 천식 등)을 가진 아이의 보호자가 질환·예산·맛 조건에 맞는 안전한 과자를 즉시 찾을 수 있는 서비스입니다.',
  generator: 'v0.app',
  keywords: ['과자 추천', '어린이 간식', '알레르기', '아토피', '소아 당뇨', '안심 과자'],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#D9472E',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${blackHanSans.variable} ${dmSerifDisplay.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-background">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
