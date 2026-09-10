import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Runs inside the shared `node` container (same pattern as the sibling
// projects). Host/port come from NODE_HOST / NODE_PORT.
//
// The backend is served the existing way: host nginx vhost `api-emaw.do.com`
// -> php-8.2 FPM. That name only resolves in the Windows hosts file, and the
// docker host is only reachable from this container via the aksay_net gateway,
// so Vite proxies `/api` to the gateway and sets the vhost name as the Host
// header. Same-origin in the browser keeps the Symfony session cookie working
// without any CORS / SameSite handling.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const host = process.env.NODE_HOST || env.NODE_HOST || '0.0.0.0'
  const port = Number(process.env.NODE_PORT || env.NODE_PORT) || 5173
  const apiTarget = env.VITE_API_TARGET || 'http://172.30.49.1'
  const apiHostHeader = env.VITE_API_HOST_HEADER || 'api-emaw.do.com'

  return {
    plugins: [vue()],
    server: {
      host,
      port,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: false,
          secure: false,
          headers: { Host: apiHostHeader },
        },
      },
    },
  }
})
