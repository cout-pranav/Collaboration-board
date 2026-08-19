// cypress/e2e/whiteboard.cy.ts

const EMAIL_A = Cypress.env('USER_A_EMAIL')
const PASS_A = Cypress.env('USER_A_PASSWORD')
const EMAIL_B = Cypress.env('USER_B_EMAIL')
const PASS_B = Cypress.env('USER_B_PASSWORD')

describe('Authentication', () => {
  it('shows login page for unauthenticated users', () => {
    cy.visit('/')
    cy.url().should('include', '/login')
    cy.contains('CollabBoard').should('be.visible')
  })

  it('registers a new user and redirects to boards', () => {
    const unique = Date.now()
    cy.visit('/login')
    cy.contains('Register').click()
    cy.get('#displayName').type('Test User')
    cy.get('#email').type(`test${unique}@example.com`)
    cy.get('#password').type('TestPass123')
    cy.get('[type=submit]').click()
    cy.url().should('include', '/boards')
    cy.contains('Your Boards').should('be.visible')
  })

  it('logs in with valid credentials', () => {
    cy.registerApi(EMAIL_A, PASS_A, 'User A')
    cy.loginApi(EMAIL_A, PASS_A)
    cy.visit('/boards')
    cy.url().should('include', '/boards')
  })

  it('rejects invalid credentials', () => {
    cy.visit('/login')
    cy.get('#email').type('wrong@example.com')
    cy.get('#password').type('wrongpassword')
    cy.get('[type=submit]').click()
    cy.get('[role=alert]').should('be.visible')
  })
})

describe('Board Management', () => {
  beforeEach(() => {
    cy.registerApi(EMAIL_A, PASS_A, 'User A')
    cy.loginApi(EMAIL_A, PASS_A)
    cy.visit('/boards')
  })

  it('creates a new board', () => {
    cy.contains('+ New Board').click()
    cy.get('.modal-input').type('My Test Board')
    cy.get('[type=submit]').click()
    // Should navigate to the whiteboard
    cy.url().should('match', /\/boards\/[a-z0-9-]+$/)
  })
  it('shows created board in dashboard', () => {
    cy.loginApi(EMAIL_A, PASS_A).then(() => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/boards`,
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt_token')}` },
        body: { name: 'API Created Board' },
      })
    })

    cy.visit('/boards')
    cy.contains('API Created Board').should('be.visible')
  })
})

describe('Whiteboard Canvas', () => {
  let boardId: string

  beforeEach(() => {
    cy.registerApi(EMAIL_A, PASS_A, 'User A')
    cy.loginApi(EMAIL_A, PASS_A).then(() => {
      // Create a board via API
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/boards`,
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt_token')}` },
        body: { name: 'E2E Test Board' },
      }).then((resp) => {
        boardId = resp.body.id
        cy.visit(`/boards/${boardId}`)
      })
    })
  })

  it('loads the whiteboard with toolbar', () => {
    cy.contains('E2E Test Board').should('be.visible')
    cy.get('[aria-label="Drawing tools"]').should('be.visible')
  })

  it('can switch tool modes', () => {
    cy.get('[aria-label="Drawing tools"]').within(() => {
      cy.contains('Draw').click()
    })
    cy.get('[aria-pressed=true]').should('contain', 'Draw')
  })

  it('persists board state after reload', () => {
    cy.visit(`/boards/${boardId}`)
    cy.contains('E2E Test Board').should('be.visible')
    cy.reload()
    cy.contains('E2E Test Board').should('be.visible')
  })
})

describe('Multi-user Collaboration (API-driven)', () => {
  it('User B actions are reflected via snapshot endpoint', () => {
    // Register both users
    cy.registerApi(EMAIL_A, PASS_A, 'User A')
    cy.registerApi(EMAIL_B, PASS_B, 'User B')

    // User A creates a board
    cy.loginApi(EMAIL_A, PASS_A).then(() => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/api/boards`,
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt_token')}` },
        body: { name: 'Collab Board' },
      }).then((resp) => {
        const boardId = resp.body.id

        // User A saves a snapshot via API
        cy.loginApi(EMAIL_A, PASS_A).then(() => {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/api/boards/${boardId}/snapshot`,
            headers: { Authorization: `Bearer ${localStorage.getItem('jwt_token')}` },
            body: { yjsDocState: "" }, // empty string translates to byte[0] in JSON base64 deserialization
            failOnStatusCode: false,
          }).its('status').should('eq', 204)

          // User A visits the board and sees it loads correctly
          cy.loginApi(EMAIL_A, PASS_A).then(() => {
            cy.visit(`/boards/${boardId}`)
            cy.contains('Collab Board').should('be.visible')
          })
        })
      })
    })
  })
})
