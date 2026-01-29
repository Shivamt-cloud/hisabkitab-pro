/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    electronAPI?: {
      platform: string
      versions: { node: string; chrome: string; electron: string }
      app: { getName: () => string; getVersion: () => string }
      printers: {
        list: () => Promise<
          Array<{
            name: string
            displayName?: string
            isDefault?: boolean
            status?: number
            description?: string
            options?: Record<string, any>
          }>
        >
      }
      print: {
        html: (payload: {
          html: string
          silent?: boolean
          deviceName?: string
          pageSize?: any
        }) => Promise<{ ok: boolean; error?: string }>
      }
    }
  }
}

export {}
