export const loginUser = async ({ email, password }) => {
  // Fake "backend" login
  if (email === 'admin@example.com' && password === 'admin') {
    return { email, role: 'admin' };
  }
  if (email === 'user@example.com' && password === 'user') {
    return { email, role: 'user' };
  }

  throw new Error('Invalid credentials');
};

