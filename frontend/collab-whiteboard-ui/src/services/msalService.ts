import { PublicClientApplication, type Configuration, type AuthenticationResult } from '@azure/msal-browser'

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

let initPromise: Promise<AuthenticationResult | null> | null = null

export function initMsal(): Promise<AuthenticationResult | null> {
  if (!initPromise) {
    initPromise = (async () => {
      await msalInstance.initialize()
      // Parses the URL hash if we just came back from Microsoft, returns the auth result
      return await msalInstance.handleRedirectPromise()
    })()
  }
  return initPromise
}

export async function loginWithMicrosoft() {
  await initMsal()
  
  const loginRequest = {
    scopes: ['openid', 'profile', 'email'],
  }

  // Redirects the whole page to Microsoft instead of using a popup. 
  // This is 100x more stable and immune to popup blockers.
  await msalInstance.loginRedirect(loginRequest)
}
