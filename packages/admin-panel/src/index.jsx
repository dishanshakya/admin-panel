// src/index.jsx
// Public API of @lynx/admin-panel — this is the ONLY file consumers import from.

// --- Setup / providers ---
export { AdminProvider } from "./contexts/AdminProvider.jsx";
export { useApi, useGet } from "./contexts/ApiContext.jsx";
export { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
export { AdminGate } from "./components/templates/AdminGate.jsx";
export { AdminShell } from "./components/templates/AdminShell.jsx";
export { AdminLayout } from "./components/templates/AdminLayout.jsx";
export {
  AdminChildrenLayout,
  useEntity,
} from "./components/templates/AdminChildrenLayout.jsx";

// --- Data / entity config ---
export { useFetchEntity } from "./hooks/useFetchEntity.js";
export { setRuntimeConfig, getRuntimeConfig } from "./lib/runtime.config.js";
export { AdminConfigInit } from "./contexts/AdminConfigInit.jsx";
export { defineEntity, defineEntities } from "./lib/entitySchema.js";
// index.jsx
export { allowed } from "./lib/access.js";

// --- Templates ---
export { default as DataTable } from "./components/templates/DataTable.jsx";
export { ImageUploader } from "./components/templates/ImageUploader.jsx";
export { LoginPage } from "./components/templates/LoginPage.jsx";

// --- Organisms ---
export { PayloadEntityForm } from "./components/organisms/PayloadEntityForm.jsx";
export { AdminNav } from "./components/organisms/AdminNav.jsx";
export { Logo as AdminNavLogo } from "./components/organisms/AdminNavLogo.jsx";
export { DeleteAction } from "./components/organisms/DeleteAction.jsx";
export { MediaLibraryModal } from "./components/organisms/MediaLibraryModal.jsx";
export { DateTime } from "./components/organisms/DateTime.jsx";
export { LibraryImageBlock } from "./components/organisms/LibraryImageBlock.jsx";
export { ButtonBlock } from "./components/organisms/ButtonBlock.jsx";
export { EmbedBlock } from "./components/organisms/EmbedBlock.jsx";
export { default as ArticleEditor } from "./components/organisms/BlockNote.jsx";
export { SchemaEditor } from "./components/organisms/SchemaEditor.jsx";
export { PostForm } from "./components/organisms/forms/PostForm.jsx";

// --- Molecules ---
export { default as Breadcrumb } from "./components/molecules/Breadcrumb.jsx";
export { InputFields } from "./components/molecules/InputFields.jsx";
export { Form, DefaultsContext } from "./components/molecules/Form.jsx";
export { PayloadField } from "./components/molecules/PayloadField.jsx";

// --- Atoms ---
export {
  Input,
  Select,
  Textarea,
  NumberSelector,
  RateInput,
  RateDisplay,
} from "./components/atoms/Input.jsx";
export { RelationshipField } from "./components/atoms/RelationshipField.jsx";
export { Badge } from "./components/atoms/Badge.jsx";
export {
  Button,
  BlueRedButton,
  EditButton,
  DeleteButton,
  ViewButton,
  ResetButton,
  default as BackButton,
} from "./components/atoms/Buttons.jsx";
export { TagInput } from "./components/atoms/TagInput.jsx";

// --- Utils ---
export { cn, resolveUrl, isUuid, removeEmptyFields } from "./utils/utils.js";
export { useToast } from "./contexts/ToastContext.jsx";
