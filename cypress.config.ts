import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    env: {
      apiUrl: 'http://localhost:5000',
      // Injected in CI via GitHub Secrets
      USER_A_EMAIL: 'user-a@test.com',
      USER_A_PASSWORD: 'TestPass123',
      USER_B_EMAIL: 'user-b@test.com',
      USER_B_PASSWORD: 'TestPass123',
    },
  },
  component: {
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.cy.ts',
  },
})
