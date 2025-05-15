
// This file now imports from the registration folder for better organization
import { ProgressiveRegistration as Registration } from "./registration/ProgressiveRegistration";

export function ProgressiveRegistration() {
  return <Registration />;
}

// Export as default and named component for compatibility
export default ProgressiveRegistration;
