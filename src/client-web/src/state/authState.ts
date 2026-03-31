import { proxy } from "valtio";

export const authState = proxy({
  showAuthModal: false,
});
