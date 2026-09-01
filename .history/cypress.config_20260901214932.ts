import { defineConfig } from 'cypress'

export default defineConfig({
  projectId: 'fwyr5f',
  e2e: {
    baseUrl: 'https://www.demoblaze.com',
    supportFile: false,
  },
})
