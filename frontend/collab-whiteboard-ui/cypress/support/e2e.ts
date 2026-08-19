// cypress/support/e2e.ts — global support file

// ── Custom Commands ───────────────────────────────────────────────────────────

Cypress.Commands.add('loginApi', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/login`,
    body: { email, password },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200) {
      const auth = response.body
      localStorage.setItem('jwt_token', auth.token)
      localStorage.setItem('auth_user', JSON.stringify(auth))
    }
  })
})

Cypress.Commands.add('registerApi', (email: string, password: string, displayName: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/api/auth/register`,
    body: { email, password, displayName },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200) {
      const auth = response.body
      localStorage.setItem('jwt_token', auth.token)
      localStorage.setItem('auth_user', JSON.stringify(auth))
    }
  })
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      loginApi(email: string, password: string): Chainable<void>
      registerApi(email: string, password: string, displayName: string): Chainable<void>
    }
  }
}
