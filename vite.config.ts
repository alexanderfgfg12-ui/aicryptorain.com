import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// For a project site, set VITE_BASE_PATH=/REPOSITORY_NAME/ in GitHub Actions.
// For a user/organization site or custom domain, use '/'.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
})