// lib/access.js
export const allowed = (roles) => ({ req: { user } }) => {
  return Boolean(user && roles.includes(user.role));
};
