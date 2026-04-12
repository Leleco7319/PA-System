import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static'],
  // Necessário para servir arquivos de áudio de public/uploads
  async headers() {
    return [
      {
        source: '/uploads/:filename*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
