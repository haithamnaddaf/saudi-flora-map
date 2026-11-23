import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir:'./test/browser',
  workers:2,
  use:{baseURL:'http://127.0.0.1:4181',channel:process.env.BROWSER_CHANNEL,viewport:{width:1440,height:1000}},
  webServer:{command:'npm run preview -- --port 4181 --strictPort',url:'http://127.0.0.1:4181',reuseExistingServer:false},
  reporter:'list'
})
