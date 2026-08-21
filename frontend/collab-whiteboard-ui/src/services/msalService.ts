import { PublicClientApplication, type Configuration } from '@azure/msal-browser'

const msalConfig: Configuration = {
  auth: {
    clientId: 'f000bbcc-7cfa-4cf7-899c-cb345918ba98',
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin, // e.g. http://localhost:5173
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

let initPromise: Promise<void> | null = null

export async function loginWithMicrosoft() {
  if (!initPromise) {
    initPromise = msalInstance.initialize()
  }
  await initPromise
  
  const loginRequest = {
    scopes: ['openid', 'profile', 'email'],
  }

  try {
    const response = await msalInstance.loginPopup(loginRequest)
    // The idToken is what we need to send to our backend
    return response.idToken
  } catch (error) {
    console.error('Microsoft login failed:', error)
    throw error
  }
}
