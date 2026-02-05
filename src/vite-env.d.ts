/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_X_APP_TOKEN?: string;
  readonly VITE_NODE_JS_MICROSERVICE_BACKEND_URL?: string;
  readonly VITE_INMATE_PHOTOS_API_ROUTE?: string;
  readonly VITE_CONVERSATION_SID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
