// This file is kept for backward compatibility
// All settings functionality has been moved to /settings/* routes
import { Navigate } from 'react-router-dom'

export default function Settings() {
  return <Navigate to="/settings/profile" replace />
}
